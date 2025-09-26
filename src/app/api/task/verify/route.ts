// /src/app/api/task/verify/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { auth } from "@/auth"
import { Campaign } from "@/models/Campaign"
import SocialAccount from "@/models/SocialAccount"
import Submission from "@/models/Submission"
import {
  resolveTwitterUserId,
  checkTwitterFollow,
  checkTwitterLike,
  checkTwitterRetweet,
} from "@/lib/twitter"

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

// ─────────────────────────────
// Helper: parse tweetId dari URL
// ─────────────────────────────
function parseTweetId(url: string): string {
  const u = new URL(url)
  const parts = u.pathname.split("/")
  const tweetId = parts.find((p) => /^\d+$/.test(p))
  if (!tweetId) throw new Error("No tweetId in URL")
  return tweetId
}

export async function POST(req: Request) {
  await dbConnect()

  // 1) auth
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2) parse body
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { campaignId, task } = body as {
    campaignId?: string
    task?: { service?: string; type?: string; url?: string }
  }

  if (!campaignId || !task?.service || !task?.type || !task?.url) {
    return NextResponse.json(
      { error: "Missing campaignId or task fields" },
      { status: 400 }
    )
  }

  const service = task.service as ServiceName
  const incomingTask: CampaignTask = {
    service,
    type: task.type,
    url: task.url,
  }

  // 3) load campaign
  const campaignDoc = await Campaign.findById(campaignId)
  if (!campaignDoc) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const campaignTasks = (Array.isArray((campaignDoc as any).tasks)
    ? (campaignDoc as any).tasks
    : []) as CampaignTask[]

  const taskInCampaign = campaignTasks.find(
    (t) =>
      t.service === incomingTask.service &&
      t.type === incomingTask.type &&
      t.url === incomingTask.url
  )
  if (!taskInCampaign) {
    return NextResponse.json({ error: "Task not in campaign" }, { status: 400 })
  }

  // 4) Service-specific verification
  if (incomingTask.service === "twitter") {
    const social = await SocialAccount.findOne({
      userId: session.user.id,
      provider: "twitter",
    })
    if (!social) {
      return NextResponse.json(
        { error: "Twitter not connected" },
        { status: 400 }
      )
    }

    if (incomingTask.type === "follow") {
      // --- ambil username dari URL
      let usernameToCheck: string
      try {
        const u = new URL(incomingTask.url)
        if (
          !u.hostname.includes("twitter.com") &&
          !u.hostname.includes("x.com")
        ) {
          throw new Error("Not a valid Twitter/X domain")
        }

        usernameToCheck = u.pathname
          .replace(/^\/+/, "")
          .split(/[/?]/)[0]
          .replace(/^@/, "")
          .toLowerCase()

        if (!usernameToCheck) throw new Error("empty username")
      } catch (err) {
        return NextResponse.json(
          { error: "Invalid Twitter URL in task", details: String(err) },
          { status: 400 }
        )
      }

      // --- cek cache targetId
      let targetId: string | undefined = taskInCampaign.targetId
      if (!targetId) {
        const resolvedId = await resolveTwitterUserId(usernameToCheck)
        targetId = resolvedId ?? undefined
        if (!targetId) {
          return NextResponse.json(
            { error: "Twitter target not found", username: usernameToCheck },
            { status: 404 }
          )
        }

        
        // ✅ simpan ke campaign (cache targetId)
        taskInCampaign.targetId = targetId
        await campaignDoc.save()
      }

      // --- check follow pakai bot
      const isFollowing = await checkTwitterFollow(social, targetId)
      if (!isFollowing) {
        return NextResponse.json(
          { error: "Twitter task not completed (not following)" },
          { status: 400 }
        )
      }
    }

    if (incomingTask.type === "like") {
      try {
        if (!taskInCampaign.tweetId) {
          taskInCampaign.tweetId = parseTweetId(incomingTask.url)
          await campaignDoc.save()
        }

        const ok = await checkTwitterLike(
          social.socialId,
          taskInCampaign.tweetId
        )
        if (!ok) {
          return NextResponse.json(
            { error: "Twitter task not completed (not liked)" },
            { status: 400 }
          )
        }
      } catch (err) {
        return NextResponse.json(
          { error: "Invalid Twitter Like task URL", details: String(err) },
          { status: 400 }
        )
      }
    }

    if (incomingTask.type === "retweet") {
      try {
        if (!taskInCampaign.tweetId) {
          taskInCampaign.tweetId = parseTweetId(incomingTask.url)
          await campaignDoc.save()
        }

        const ok = await checkTwitterRetweet(
          social.socialId,
          taskInCampaign.tweetId
        )
        if (!ok) {
          return NextResponse.json(
            { error: "Twitter task not completed (not retweeted)" },
            { status: 400 }
          )
        }
      } catch (err) {
        return NextResponse.json(
          { error: "Invalid Twitter Retweet task URL", details: String(err) },
          { status: 400 }
        )
      }
    }
  }

  // 5) update Submission
  const now = new Date()
  let submission = await Submission.findOne({
    userId: session.user.id,
    campaignId,
  })

  if (!submission) {
    // ✅ inisialisasi semua campaignTasks
    submission = await Submission.create({
      userId: session.user.id,
      campaignId,
      tasks: campaignTasks.map((ct) => ({
        service: ct.service,
        type: ct.type,
        url: ct.url,
        done:
          ct.service === incomingTask.service &&
          ct.type === incomingTask.type &&
          ct.url === incomingTask.url,
        verifiedAt:
          ct.service === incomingTask.service &&
          ct.type === incomingTask.type &&
          ct.url === incomingTask.url
            ? now
            : undefined,
      })),
      status: campaignTasks.length === 1 ? "submitted" : "pending",
    })
  } else {
    // ✅ merge semua campaignTasks agar tidak ada yang hilang
    const subTasks = campaignTasks.map((ct) => {
      const already = (submission.tasks as SubmissionTask[]).find(
        (st) =>
          st.service === ct.service && st.type === ct.type && st.url === ct.url
      )

      if (
        ct.service === incomingTask.service &&
        ct.type === incomingTask.type &&
        ct.url === incomingTask.url
      ) {
        // task yg baru diverifikasi
        return {
          service: ct.service,
          type: ct.type,
          url: ct.url,
          done: true,
          verifiedAt: now,
        }
      }

      return already || {
        service: ct.service,
        type: ct.type,
        url: ct.url,
        done: false,
      }
    })

    submission.tasks = subTasks
    submission.status = subTasks.every((st) => st.done) ? "submitted" : "pending"
    await submission.save()
  }

  return NextResponse.json({
    success: true,
    status: submission.status,
    submission,
  })
}
