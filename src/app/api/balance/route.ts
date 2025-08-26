import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Submission from "@/models/Submission"
import Campaign from "@/models/Campaign"
import { auth } from "@/auth"

export async function GET() {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ambil semua submissions user (submitted & approved)
  const submissions = await Submission.find({
    userId: session.user.id,
    status: { $in: ["submitted", "approved"] },
  })

  // ambil campaign terkait
  const campaignIds = submissions.map((s) => s.campaignId)
  const campaigns = await Campaign.find({ _id: { $in: campaignIds } })

  // hitung balance
  const balance = campaigns.reduce(
    (acc, c) => acc + parseFloat(c.reward || "0"),
    0
  )

  return NextResponse.json({ balance })
}
