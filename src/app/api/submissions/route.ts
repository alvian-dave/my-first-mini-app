// /src/app/api/submission/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Submission from "@/models/Submission"
import { Campaign } from "@/models/Campaign"
import Balance from "@/models/Balance"
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

  // cek submission hunter
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

  // reward cuma dikasih sekali
  if ((submission as any).rewarded) {
    return NextResponse.json({ error: "Already rewarded" }, { status: 400 })
  }

  // ambil campaign
  const campaign = await Campaign.findOneAndUpdate(
    { _id: campaignId, status: "active" },
    {
      $inc: { contributors: 1 },
      $addToSet: { participants: session.user.id }, // ✅ tambahkan participant unik
    },
    { new: true }
  )

  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found or inactive" },
      { status: 404 }
    )
  }

  // update balance hunter
  let hunterBalance = await Balance.findOne({ userId: session.user.id })
  if (!hunterBalance) {
    hunterBalance = await Balance.create({ userId: session.user.id, amount: 0 })
  }
  hunterBalance.amount += Number(campaign.reward)
  await hunterBalance.save()

  // update submission → mark completed + rewarded
  submission.status = "submitted"
  ;(submission as any).rewarded = true
  await submission.save()

  return NextResponse.json({
    success: true,
    submission: submission.toObject(),
    campaign: campaign.toObject(),
    newBalance: hunterBalance.amount,
  })
}
