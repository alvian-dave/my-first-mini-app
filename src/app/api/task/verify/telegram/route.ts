import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { auth } from "@/auth"
import { Campaign } from "@/models/Campaign"
import SocialAccount from "@/models/SocialAccount"
import Submission from "@/models/Submission"
import { resolveTelegramChatId } from "@/lib/telegram"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

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

  // 1️⃣ Auth
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  // 2️⃣ Parse body
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

  // 3️⃣ Load campaign & tasks
  const campaignDoc = await Campaign.findById(campaignId)
  if (!campaignDoc) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const campaignTasks: CampaignTask[] = Array.isArray((campaignDoc as any).tasks)
    ? ((campaignDoc as any).tasks as CampaignTask[])
    : []

  // 4️⃣ Load user's submission (if any)
  let submission = await Submission.findOne({ userId, campaignId })

  // 5️⃣ Determine which task to verify
  let idx: number | null = null

  if (typeof taskIndex === "number") {
    if (taskIndex < 0 || taskIndex >= campaignTasks.length) {
      return NextResponse.json({ error: "Invalid taskIndex" }, { status: 400 })
    }
    idx = taskIndex
  } else if (task && task.url) {
    idx = campaignTasks.findIndex(
      (t: CampaignTask) =>
        t.service === (task.service || "telegram") &&
        t.type === task.type &&
        t.url === task.url
    )
    if (idx === -1) idx = null
  } else {
    // cari telegram task pertama yang belum done
    if (submission && Array.isArray(submission.tasks) && submission.tasks.length) {
      idx = campaignTasks.findIndex((ct: CampaignTask) => {
        if (ct.service !== "telegram") return false
        const matched = (submission.tasks as SubmissionTask[]).find(
          (st) =>
            st.service === ct.service && st.type === ct.type && st.url === ct.url
        )
        return !matched || matched.done === false
      })
    }

    // fallback: ambil telegram pertama
    if (idx === -1 || idx === null) {
      idx = campaignTasks.findIndex((t: CampaignTask) => t.service === "telegram")
      if (idx === -1) idx = null
    }
  }

  if (idx === null) {
    return NextResponse.json({ error: "Telegram task not found in campaign" }, { status: 400 })
  }

  const taskInCampaign = campaignTasks[idx]
  if (!taskInCampaign || taskInCampaign.service !== "telegram") {
    return NextResponse.json({ error: "Invalid or non-telegram task" }, { status: 400 })
  }

  // 6️⃣ Pastikan user sudah connect Telegram
  const social = await SocialAccount.findOne({ userId, provider: "telegram" })
  if (!social || !social.socialId) {
    return NextResponse.json({ error: "Telegram not connected" }, { status: 400 })
  }

  // 7️⃣ Resolve chat_id (cache jika belum)
  let chatId = taskInCampaign.targetId
  if (!chatId) {
    try {
      chatId = await resolveTelegramChatId(taskInCampaign.url, BOT_TOKEN)
      if (!chatId) {
        return NextResponse.json({ error: "Failed to resolve chatId" }, { status: 400 })
      }

      // cache ke campaign
      campaignTasks[idx].targetId = chatId
      campaignDoc.tasks = campaignTasks
      await campaignDoc.save()
      console.log(`[Cache] Saved Telegram chat_id for ${taskInCampaign.url} → ${chatId}`)
    } catch (err: any) {
      console.error("Failed to resolve Telegram chat_id:", err)
      return NextResponse.json(
        { error: "Error resolving Telegram chatId", details: String(err) },
        { status: 500 }
      )
    }
  }

  // 8️⃣ Verify membership
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(
      String(chatId)
    )}&user_id=${encodeURIComponent(String(social.socialId))}`

    const res = await fetch(url)
    const data = await res.json()
    console.log("Telegram getChatMember:", { url, data })

    if (!data || data.ok !== true) {
      return NextResponse.json(
        { success: false, error: data?.description || "Failed to check membership" },
        { status: 400 }
      )
    }

    const status = data.result?.status
    const isMember = ["member", "administrator", "creator"].includes(status)

    if (!isMember) {
      return NextResponse.json(
        { success: false, error: "Telegram task not completed (not a member)" },
        { status: 400 }
      )
    }

    // ✅ User adalah member → update submission
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
          ct.service === "telegram" &&
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

    // ✅ Response sama format dengan Twitter verify
    return NextResponse.json({
      success: true,
      status: submission.status,
      submission,
    })
  } catch (err: any) {
    console.error("Telegram verification error:", err)
    return NextResponse.json(
      { success: false, error: "Unexpected error during verification", details: String(err) },
      { status: 500 }
    )
  }
}
