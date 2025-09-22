// /src/app/api/submissions/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Submission from "@/models/Submission"
import { Campaign } from "@/models/Campaign"
import Balance from "@/models/Balance"
import { Notification } from "@/models/Notification"
import { auth } from "@/auth"

// ✅ definisi Task biar gak implicit any
type Task = { service: string; type: string; url: string; done?: boolean; verifiedAt?: Date }

export async function GET(req: Request) {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get("campaignId")

  if (campaignId) {
    // ✅ ambil campaign + submission untuk merge
    const campaign = await Campaign.findById(campaignId).lean()
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const submission = await Submission.findOne({
      userId: session.user.id,
      campaignId,
    }).lean()

    // list tasks dari campaign
    const campaignTasks: Task[] = Array.isArray((campaign as any).tasks)
      ? (campaign as any).tasks
      : []

    let mergedTasks: Task[] = campaignTasks

    if (submission) {
      const submissionTasks: Task[] = Array.isArray((submission as any).tasks)
        ? (submission as any).tasks
        : []

      // ✅ merge: ambil task campaign, tambahkan status dari submission kalau ada
      mergedTasks = campaignTasks.map((ct: Task) => {
        const matched = submissionTasks.find(
          (st: Task) =>
            st.service === ct.service &&
            st.type === ct.type &&
            st.url === ct.url
        )
        return matched
          ? { ...ct, done: matched.done, verifiedAt: matched.verifiedAt }
          : { ...ct, done: false }
      })
    } else {
      // kalau belum ada submission, semua task default done = false
      mergedTasks = campaignTasks.map((ct: Task) => ({ ...ct, done: false }))
    }

    return NextResponse.json({
      submission: submission
        ? { ...submission, tasks: mergedTasks }
        : { userId: session.user.id, campaignId, tasks: mergedTasks, status: "pending" },
    })
  }

  // default → list semua submission hunter
  const submissions = await Submission.find({ userId: session.user.id }).lean()
  return NextResponse.json({ submissions })
}

export async function POST(req: Request) {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { campaignId } = await req.json()
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 })
  }

  // ambil submission hunter
  const submission = await Submission.findOne({
    userId: session.user.id,
    campaignId,
  })
  if (!submission) {
    return NextResponse.json(
      { error: "No submission found. Please verify tasks first." },
      { status: 400 }
    )
  }

  // kalau belum semua task done → error
  if (submission.status !== "submitted") {
    return NextResponse.json(
      { error: "Not all tasks verified yet" },
      { status: 400 }
    )
  }

  // ambil campaign
  const campaign = await Campaign.findOneAndUpdate(
    { _id: campaignId, status: "active" },
    {
      $addToSet: { participants: session.user.id }, // tambahkan participant unik
    },
    { new: true }
  )

  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found or inactive" },
      { status: 404 }
    )
  }

  // hitung ulang contributors
  campaign.contributors = campaign.participants.length
  await campaign.save()

  let rewarded = false
  // update balance hunter → cuma sekali
  let hunterBalance = await Balance.findOne({ userId: session.user.id })
  if (!hunterBalance) {
    // ✅ tambahkan role: "hunter" sesuai schema
    hunterBalance = await Balance.create({
      userId: session.user.id,
      role: "hunter",
      amount: 0,
    })
  }
  if (!(submission as any).rewarded) {
    hunterBalance.amount += Number(campaign.reward)
    await hunterBalance.save()
    rewarded = true
    ;(submission as any).rewarded = true
    await submission.save()

    // ✅ Notifikasi untuk Hunter
    await Notification.create({
      userId: session.user.id,
      role: "hunter",
      type: "submission_completed",
      message: `You have successfully completed the campaign "${campaign.title}" and earned ${campaign.reward} tokens.`,
    })

    // ✅ Notifikasi untuk Promoter
    await Notification.create({
      userId: campaign.createdBy,
      role: "promoter",
      type: "submission_completed",
      message: `Hunter "${session.user.username || session.user.id}" has successfully completed your campaign "${campaign.title}".`,
    })
  }

  return NextResponse.json({
    success: true,
    submission: submission.toObject(),
    campaign: campaign.toObject(),
    newBalance: hunterBalance.amount,
    alreadyRewarded: !rewarded, // frontend bisa pakai ini untuk toast message
  })
}
