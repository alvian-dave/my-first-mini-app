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

  // ambil semua submission hunter
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

  // cek hunter sudah submit campaign ini?
  const exists = await Submission.findOne({
    userId: session.user.id,
    campaignId,
  }).lean()
  if (exists) {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 })
  }

  // ambil campaign
  const campaign = await Campaign.findById(campaignId)
  if (!campaign || campaign.status !== "active") {
    return NextResponse.json(
      { error: "Campaign not found or inactive" },
      { status: 404 }
    )
  }

  // buat submission dengan tasks dari campaign
  const submission = await Submission.create({
    userId: session.user.id,
    campaignId,
    tasks: campaign.tasks.map((t: any) => ({
      service: t.service,
      type: t.type,
      url: t.url,
      done: false,
    })),
    status: "submitted",
    createdAt: new Date(),
  })

  // increment contributors campaign
  campaign.contributors = (campaign.contributors || 0) + 1
  await campaign.save()

  // ambil / buat balance hunter
  let hunterBalance = await Balance.findOne({ userId: session.user.id })
  if (!hunterBalance) {
    hunterBalance = await Balance.create({ userId: session.user.id, amount: 0 })
  }

  // tambah reward ke balance hunter
  hunterBalance.amount += Number(campaign.reward)
  await hunterBalance.save()

  // ✅ langsung kirim balance terbaru ke frontend
  return NextResponse.json({
    success: true,
    newSubmission: submission.toObject(),
    updatedCampaign: campaign.toObject(),
    newBalance: hunterBalance.amount,
  })
}
