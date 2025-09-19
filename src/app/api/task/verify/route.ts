// /api/task/verify/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { auth } from "@/auth"
import { Campaign } from "@/models/Campaign"
import SocialAccount from "@/models/SocialAccount"
import Submission from "@/models/Submission"
import fetch from "node-fetch"

export async function POST(req: Request) {
  await dbConnect()

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { campaignId, task } = body as {
    campaignId: string
    task: { service: string; type: string; url: string }
  }

  if (!campaignId || !task) {
    return NextResponse.json({ error: "Missing campaignId or task" }, { status: 400 })
  }

  // ambil campaign (tanpa lean, supaya bisa save & update)
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  if (!Array.isArray(campaign.tasks)) {
    return NextResponse.json({ error: "Campaign tasks data is invalid" }, { status: 500 })
  }

  // cari task yang dimaksud
  const taskInCampaign = campaign.tasks.find(
    (t) => t.service === task.service && t.type === task.type && t.url === task.url
  )
  if (!taskInCampaign) return NextResponse.json({ error: "Task not in campaign" }, { status: 400 })

  // ====== cek Twitter task ======
  if (task.service === "twitter") {
    const social = await SocialAccount.findOne({ userId: session.user.id, provider: "twitter" })
    if (!social) return NextResponse.json({ error: "Twitter not connected", code: "TWITTER_NOT_CONNECTED" }, { status: 400 })

    // panggil Twitter API untuk verifikasi
    // misal cek apakah hunter follow target
    const url = new URL(task.url)
    const usernameToCheck = url.pathname.replace("/", "")

    const twitterRes = await fetch(`https://api.twitter.com/2/users/${social.socialId}/following`, {
      headers: { Authorization: `Bearer ${social.accessToken}` },
    })
    const twitterData = await twitterRes.json()

    const isFollowing = twitterData.data?.some(
      (u: any) => u.username.toLowerCase() === usernameToCheck.toLowerCase()
    )
    if (!isFollowing) return NextResponse.json({ error: "Twitter task not completed" }, { status: 400 })
  }

  // ====== update Submission ======
  let submission = await Submission.findOne({ userId: session.user.id, campaignId })
  const now = new Date()

  if (!submission) {
    submission = await Submission.create({
      userId: session.user.id,
      campaignId,
      tasks: [{ ...task, done: true, verifiedAt: now }],
      status: campaign.tasks.length === 1 ? "submitted" : "pending", // langsung submitted jika cuma 1 task
    })
  } else {
    // update task yang diverifikasi
    const updatedTasks = [...submission.tasks]
    let found = false
    for (let i = 0; i < updatedTasks.length; i++) {
      if (
        updatedTasks[i].service === task.service &&
        updatedTasks[i].type === task.type &&
        updatedTasks[i].url === task.url
      ) {
        updatedTasks[i].done = true
        updatedTasks[i].verifiedAt = now
        found = true
      }
    }
    if (!found) {
      // task baru, push
      updatedTasks.push({ ...task, done: true, verifiedAt: now })
    }

    submission.tasks = updatedTasks

    // cek apakah semua task di campaign sudah done
    const allDone = campaign.tasks.every((t) =>
      submission.tasks.some((s) => s.service === t.service && s.type === t.type && s.url === t.url && s.done)
    )

    submission.status = allDone ? "submitted" : "pending"
    await submission.save()
  }

  return NextResponse.json({ success: true, status: submission.status })
}
