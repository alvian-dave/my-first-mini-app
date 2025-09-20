// /src/app/api/task/verify/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { auth } from "@/auth"
import { Campaign } from "@/models/Campaign"
import SocialAccount from "@/models/SocialAccount"
import Submission from "@/models/Submission"
import { resolveTwitterUserId, checkTwitterFollow } from "@/lib/twitter"

type ServiceName = "twitter" | "discord" | "telegram"

interface CampaignTask {
  service: ServiceName
  type: string
  url: string
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
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    )
  }

  // 2) parse body
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "INVALID_BODY" },
      { status: 400 }
    )
  }

  const { campaignId, task } = body as {
    campaignId?: string
    task?: { service?: string; type?: string; url?: string }
  }

  if (!campaignId || !task?.service || !task?.type || !task?.url) {
    return NextResponse.json(
      { error: "Missing campaignId or task fields", code: "MISSING_FIELDS" },
      { status: 400 }
    )
  }

  // normalize
  const service = task.service as ServiceName
  const incomingTask: CampaignTask = {
    service,
    type: task.type,
    url: task.url,
  }

  // 3) load campaign
  const campaignDoc = await Campaign.findById(campaignId)
  if (!campaignDoc) {
    return NextResponse.json(
      { error: "Campaign not found", code: "CAMPAIGN_NOT_FOUND" },
      { status: 404 }
    )
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
    return NextResponse.json(
      { error: "Task not in campaign", code: "TASK_NOT_IN_CAMPAIGN" },
      { status: 400 }
    )
  }

  // 4) Service-specific verification
  if (incomingTask.service === "twitter") {
    const social = await SocialAccount.findOne({
      userId: session.user.id,
      provider: "twitter",
    })
    if (!social) {
      return NextResponse.json(
        { error: "Twitter not connected", code: "TWITTER_NOT_CONNECTED" },
        { status: 400 }
      )
    }

    // --- ambil username dari URL (support twitter.com & x.com)
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
        {
          error: "Invalid Twitter URL in task",
          code: "INVALID_TWITTER_URL",
          details: String(err),
        },
        { status: 400 }
      )
    }

    // --- resolve targetId
    const targetId = await resolveTwitterUserId(
      usernameToCheck,
      social.accessToken
    )
    if (!targetId) {
      return NextResponse.json(
        { error: "Twitter target not found", code: "TARGET_NOT_FOUND", username: usernameToCheck },
        { status: 400 }
      )
    }

    // --- check follow
    try {
      const isFollowing = await checkTwitterFollow(social, targetId)
      if (!isFollowing) {
        return NextResponse.json(
          { error: "Twitter task not completed (not following)", code: "NOT_FOLLOWING" },
          { status: 400 }
        )
      }
    } catch (err) {
      console.error("Twitter verification error:", err)
      return NextResponse.json(
        { error: "Failed to verify Twitter follow", code: "VERIFY_FAILED" },
        { status: 500 }
      )
    }
  }

  // 5) update Submission
  const now = new Date()
  let submission = await Submission.findOne({
    userId: session.user.id,
    campaignId,
  })

  if (!submission) {
    submission = await Submission.create({
      userId: session.user.id,
      campaignId,
      tasks: [
        {
          service: incomingTask.service,
          type: incomingTask.type,
          url: incomingTask.url,
          done: true,
          verifiedAt: now,
        },
      ],
      status: campaignTasks.length === 1 ? "submitted" : "pending",
    })
  } else {
    const subTasks = (Array.isArray((submission as any).tasks)
      ? (submission as any).tasks
      : []) as SubmissionTask[]

    const idx = subTasks.findIndex(
      (s) =>
        s.service === incomingTask.service &&
        s.type === incomingTask.type &&
        s.url === incomingTask.url
    )

    if (idx >= 0) {
      subTasks[idx] = {
        service: incomingTask.service,
        type: incomingTask.type,
        url: incomingTask.url,
        done: true,
        verifiedAt: now,
      }
    } else {
      subTasks.push({
        service: incomingTask.service,
        type: incomingTask.type,
        url: incomingTask.url,
        done: true,
        verifiedAt: now,
      })
    }

    submission.tasks = subTasks

    // pastikan semua task campaign sudah done
    submission.status = campaignTasks.every((ct) =>
      submission.tasks.some(
        (st: SubmissionTask) =>
          st.service === ct.service &&
          st.type === ct.type &&
          st.url === ct.url &&
          st.done
      )
    )
      ? "submitted"
      : "pending"

    await submission.save()
  }

  return NextResponse.json({
    success: true,
    status: submission.status,
    submission,
  })
}
