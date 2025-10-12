// src/app/api/task/verify/discord/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { auth } from "@/auth"
import { Campaign } from "@/models/Campaign"
import SocialAccount from "@/models/SocialAccount"
import Submission from "@/models/Submission"
import { resolveDiscordGuildId, checkDiscordMembership } from "@/lib/discord"

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || ""

// Types (keep minimal)
type ServiceName = "twitter" | "discord" | "telegram"

interface CampaignTask {
  service: ServiceName
  type: string
  url: string
  targetId?: string
  tweetId?: string
}

interface SubmissionTask {
  service: ServiceName
  type: string
  url: string
  done?: boolean
  verifiedAt?: Date
}

export async function POST(req: Request) {
  await dbConnect()

  // 1) auth
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  // 2) parse body
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { campaignId, taskIndex, task } = body as {
    campaignId?: string
    taskIndex?: number
    task?: { service?: string; type?: string; url?: string }
  }

  if (!campaignId) {
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 })
  }

  // 3) load campaign & tasks
  const campaignDoc = await Campaign.findById(campaignId)
  if (!campaignDoc) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const campaignTasks: CampaignTask[] = Array.isArray((campaignDoc as any).tasks)
    ? ((campaignDoc as any).tasks as CampaignTask[])
    : []

  // 4) load user's submission (if any)
  let submission = await Submission.findOne({ userId, campaignId })

  // 5) determine task index similar to telegram flow
  let idx: number | null = null

  if (typeof taskIndex === "number") {
    if (taskIndex < 0 || taskIndex >= campaignTasks.length) {
      return NextResponse.json({ error: "Invalid taskIndex" }, { status: 400 })
    }
    idx = taskIndex
  } else if (task && task.url) {
    idx = campaignTasks.findIndex(
      (t: CampaignTask) =>
        t.service === (task.service || "discord") &&
        t.type === task.type &&
        t.url === task.url
    )
    if (idx === -1) idx = null
  } else {
    // find first discord task not done
    if (submission && Array.isArray(submission.tasks) && submission.tasks.length) {
      idx = campaignTasks.findIndex((ct: CampaignTask) => {
        if (ct.service !== "discord") return false
        const matched = (submission.tasks as SubmissionTask[]).find(
          (st) => st.service === ct.service && st.type === ct.type && st.url === ct.url
        )
        return !matched || matched.done === false
      })
    }

    // fallback: first discord task
    if (idx === -1 || idx === null) {
      idx = campaignTasks.findIndex((t: CampaignTask) => t.service === "discord")
      if (idx === -1) idx = null
    }
  }

  if (idx === null) {
    return NextResponse.json({ error: "Discord task not found in campaign" }, { status: 400 })
  }

  const taskInCampaign = campaignTasks[idx]
  if (!taskInCampaign || taskInCampaign.service !== "discord") {
    return NextResponse.json({ error: "Invalid or non-discord task" }, { status: 400 })
  }

  // 6) Ensure user connected Discord
  const social = await SocialAccount.findOne({ userId, provider: "discord" })
  if (!social || !social.socialId) {
    return NextResponse.json({ error: "Discord not connected" }, { status: 400 })
  }

  // 7) Resolve guild id (cache if not present)
  let guildId = taskInCampaign.targetId
  if (!guildId) {
    try {
      guildId = (await resolveDiscordGuildId(taskInCampaign.url, BOT_TOKEN)) || undefined
      if (!guildId) {
        return NextResponse.json({ error: "Failed to resolve guild id from URL" }, { status: 400 })
      }

      // cache to campaign
      campaignTasks[idx].targetId = guildId
      campaignDoc.tasks = campaignTasks
      await campaignDoc.save()
      console.log(`[Cache] Saved Discord guild_id for ${taskInCampaign.url} → ${guildId}`)
    } catch (err: any) {
      console.error("Failed to resolve Discord guild id:", err)
      return NextResponse.json(
        { error: "Error resolving guild id", details: String(err) },
        { status: 500 }
      )
    }
  }

  // 8) Verify membership using Bot token
  try {
    if (!BOT_TOKEN) {
      console.error("Discord BOT_TOKEN not set")
      return NextResponse.json({ error: "Server not configured for Discord verification" }, { status: 500 })
    }

    const isMember = await checkDiscordMembership(String(social.socialId), String(guildId), BOT_TOKEN)
    if (!isMember) {
      return NextResponse.json(
        { success: false, error: "Discord task not completed (not a member)" },
        { status: 400 }
      )
    }

    // ✅ User is member -> update submission (same pattern as telegram)
    const now = new Date()

    if (!submission) {
      const tasksForSubmission = campaignTasks.map((ct, i) => ({
        service: ct.service,
        type: ct.type,
        url: ct.url,
        done: i === idx,
        verifiedAt: i === idx ? now : undefined,
      }))

      submission = await Submission.create({
        userId,
        campaignId,
        tasks: tasksForSubmission,
        status: tasksForSubmission.every((t) => t.done) ? "submitted" : "pending",
      })
    } else {
      const merged = campaignTasks.map((ct: CampaignTask) => {
        const already = (submission!.tasks as SubmissionTask[]).find(
          (st) => st.service === ct.service && st.type === ct.type && st.url === ct.url
        )

        if (
          ct.service === "discord" &&
          ct.type === taskInCampaign.type &&
          ct.url === taskInCampaign.url
        ) {
          return {
            service: ct.service,
            type: ct.type,
            url: ct.url,
            done: true,
            verifiedAt: now,
          }
        }

        return (
          already || {
            service: ct.service,
            type: ct.type,
            url: ct.url,
            done: false,
          }
        )
      })

      submission.tasks = merged
      submission.status = merged.every((t) => t.done) ? "submitted" : "pending"
      await submission.save()
    }

    return NextResponse.json({
      success: true,
      status: submission.status,
      submission,
    })
  } catch (err: any) {
    console.error("Discord verification error:", err)
    return NextResponse.json(
      { success: false, error: "Unexpected error during verification", details: String(err) },
      { status: 500 }
    )
  }
}
