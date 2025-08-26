import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Submission from "@/models/Submission"
import { Campaign } from "@/models/Campaign"
import User from "@/models/User"
import { auth } from "@/auth"

export async function GET() {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const submissions = await Submission.find({ userId: session.user.id }).lean()
  return NextResponse.json(submissions)
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

  // cek sudah submit?
  const exists = await Submission.findOne({
    userId: session.user.id,
    campaignId,
  }).lean()
  if (exists) {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 })
  }

  // cari campaign (pakai lean + typing supaya TS ngerti ada reward)
  const campaign = await Campaign.findById(campaignId).lean<{
    _id: string
    reward: number
    budget: number
    title: string
    status: string
    contributors: number
  }>()
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  // buat submission
  const submission = await Submission.create({
    userId: session.user.id,
    campaignId,
  })

  // inc contributors
  await Campaign.findByIdAndUpdate(campaignId, { $inc: { contributors: 1 } })

  // tambah balance hunter
  const updatedUser = await User.findByIdAndUpdate(
    session.user.id,
    { $inc: { balance: Number(campaign.reward) } },
    { new: true }
  ).lean()

  return NextResponse.json({
    submission: submission.toObject(),
    campaign,
    user: updatedUser,
  })
}
