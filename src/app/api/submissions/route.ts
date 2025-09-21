// /src/app/api/submission/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Submission from "@/models/Submission"
import { Campaign } from "@/models/Campaign"
import Balance from "@/models/Balance"
import { Notification } from "@/models/Notification"
import { auth } from "@/auth"

export async function GET() {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
