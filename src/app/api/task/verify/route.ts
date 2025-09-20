// /src/app/api/task/verify/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { auth } from "@/auth"
import { Campaign } from "@/models/Campaign"
import SocialAccount from "@/models/SocialAccount"
import Submission from "@/models/Submission"

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

// 🔄 helper: refresh twitter token
async function refreshTwitterToken(account: any) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
    client_id: process.env.TWITTER_CLIENT_ID!,
  })

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  const json = await res.json()
  if (!("access_token" in json)) {
    throw new Error("Failed to refresh Twitter token")
  }

  account.accessToken = json.access_token
  if (json.refresh_token) {
    account.refreshToken = json.refresh_token
  }
  account.expiresAt = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000)
    : null
  await account.save()

  return account.accessToken
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
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const { campaignId, task } = body as {
    campaignId?: string
    task?: { service?: string; type?: string; url?: string }
  }

  if (!campaignId || !task?.service || !task?.type || !task?.url) {
    return NextResponse.json({ error: "Missing campaignId or task fields" }, { status: 400 })
  }

  // normalize
  const service = task.service as ServiceName
  const incomingTask: CampaignTask = { service, type: task.type, url: task.url }

  // 3) load campaign
  const campaignDoc = await Campaign.findById(campaignId)
  if (!campaignDoc) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  const campaignTasks = (Array.isArray((campaignDoc as any).tasks) ? (campaignDoc as any).tasks : []) as CampaignTask[]
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
    const social = await SocialAccount.findOne({ userId: session.user.id, provider: "twitter" })
    if (!social) {
      return NextResponse.json({ error: "Twitter not connected", code: "TWITTER_NOT_CONNECTED" }, { status: 400 })
    }

    // --- ambil username dari URL
    let usernameToCheck: string
    try {
      const u = new URL(incomingTask.url)
      usernameToCheck = u.pathname.replace(/^\/+|\/+$/g, "")
      if (!usernameToCheck) throw new Error("empty username")
    } catch {
      return NextResponse.json({ error: "Invalid Twitter URL in task" }, { status: 400 })
    }

    // --- cari target_id (promoter) by username
    const userRes = await fetch(`https://api.twitter.com/2/users/by/username/${usernameToCheck}`, {
      headers: { Authorization: `Bearer ${social.accessToken}` },
    })
    if (!userRes.ok) {
      return NextResponse.json({ error: "Failed to resolve target username" }, { status: 500 })
    }
    const userJson = await userRes.json()
    const targetId = userJson?.data?.id
    if (!targetId) {
      return NextResponse.json({ error: "Twitter target not found" }, { status: 400 })
    }

    // --- cek apakah hunter follow target
    let accessToken = social.accessToken
    async function checkFollow(token: string) {
      const res = await fetch(
        `https://api.twitter.com/2/users/${social.socialId}/following/${targetId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return res
    }

    let followRes = await checkFollow(accessToken)
    if (followRes.status === 401) {
      // coba refresh sekali
      try {
        accessToken = await refreshTwitterToken(social)
        followRes = await checkFollow(accessToken)
      } catch (err) {
        return NextResponse.json({ error: "Twitter token expired, reconnect needed" }, { status: 401 })
      }
    }

    if (followRes.status === 200) {
      // ✅ verified
    } else if (followRes.status === 404) {
      return NextResponse.json({ error: "Twitter task not completed (not following)" }, { status: 400 })
    } else {
      const err = await followRes.text().catch(() => "")
      console.error("Twitter API follow check error:", followRes.status, err)
      return NextResponse.json({ error: "Failed to verify Twitter follow" }, { status: 500 })
    }
  }

  // 5) update Submission
  const now = new Date()
  let submission = await Submission.findOne({ userId: session.user.id, campaignId })

  if (!submission) {
    submission = await Submission.create({
      userId: session.user.id,
      campaignId,
      tasks: [
        { ...incomingTask, done: true, verifiedAt: now },
      ],
      status: campaignTasks.length === 1 ? "submitted" : "pending",
    })
  } else {
    const subTasks = (Array.isArray((submission as any).tasks) ? (submission as any).tasks : []) as SubmissionTask[]
    const idx = subTasks.findIndex(
      (s) => s.service === incomingTask.service && s.type === incomingTask.type && s.url === incomingTask.url
    )
    if (idx >= 0) {
      subTasks[idx] = { ...subTasks[idx], done: true, verifiedAt: now }
    } else {
      subTasks.push({ ...incomingTask, done: true, verifiedAt: now })
    }
    submission.tasks = subTasks
    submission.status = campaignTasks.every((ct) =>
      submission.tasks.some(
        (st) => st.service === ct.service && st.type === ct.type && st.url === ct.url && st.done
      )
    )
      ? "submitted"
      : "pending"
    await submission.save()
  }

  return NextResponse.json({ success: true, status: submission.status })
}
