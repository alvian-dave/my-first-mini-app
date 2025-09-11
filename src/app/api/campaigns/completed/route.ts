import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Campaign } from "@/models/Campaign"
import { Notification } from "@/models/Notification" // ✅ import Notification
import { auth } from "@/auth"

// ✅ GET: semua campaign yg sudah diikuti hunter
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await dbConnect()

  try {
    const campaigns = await Campaign.find({
      participants: session.user.id,
    }).sort({ createdAt: -1 })

    // ---------------------------
    // Only create notification if session user is the campaign creator
    // ---------------------------
    campaigns.forEach(async (campaign) => {
      if (campaign.createdBy === session.user.id) {
        await Notification.create({
          userId: session.user.id,
          role: "promoter",
          type: "campaign_created",
          message: `Your campaign "${campaign.title}" has been successfully created.`,
        })
      }
    })
    // ---------------------------

    return NextResponse.json(campaigns)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to fetch completed campaigns" },
      { status: 500 }
    )
  }
}
