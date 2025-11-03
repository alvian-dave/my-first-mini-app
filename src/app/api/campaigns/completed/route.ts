import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Campaign } from "@/models/Campaign"
import User from "@/models/User"
import { auth } from "@/auth"

// ✅ GET: semua campaign yg sudah diikuti hunter
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await dbConnect()

  try {
    // 🔹 Ambil semua campaign yang diikuti oleh hunter (berdasarkan user.id)
    const campaigns = await Campaign.find({
      participants: session.user.id,
    })
      .sort({ createdAt: -1 })
      .lean()

    // 🔹 Kumpulkan semua ID participant unik dari semua campaign
    const allParticipantIds = [
      ...new Set(campaigns.flatMap((c) => c.participants || [])),
    ]

    // 🔹 Ambil username dari setiap participant berdasarkan _id
    const users = await User.find({ _id: { $in: allParticipantIds } })
      .select("username _id")
      .lean()

    const userMap = Object.fromEntries(
      users.map((u) => [u._id.toString(), u.username || "Anonymous"])
    )

    // 🔹 Ganti participant ID dengan username
    const campaignsWithUsernames = campaigns.map((campaign) => ({
      ...campaign,
      participants: (campaign.participants || []).map(
        (id) => userMap[id] || "(unknown user)"
      ),
    }))

    return NextResponse.json(campaignsWithUsernames)
  } catch (err) {
    console.error("[GET /api/campaigns/completed] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch completed campaigns" },
      { status: 500 }
    )
  }
}
