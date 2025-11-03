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
    // 🔹 Ambil semua campaign yg diikuti user ini
    const campaigns = await Campaign.find({
      participants: session.user.id,
    }).sort({ createdAt: -1 }).lean()

    // 🔹 Ambil semua user yang jadi participants
    const participantIds = [
      ...new Set(
        campaigns.flatMap(
          (c) => (c.participants as string[] | undefined) || []
        )
      ),
    ]

    const users = await User.find({
      _id: { $in: participantIds },
    }).lean()

    // 🔹 Buat map dari userId → username
    const userMap: Record<string, string> = Object.fromEntries(
      users.map((u) => [String(u._id), u.username || "Anonymous"])
    )

    // 🔹 Ganti participant ID dengan username
    const campaignsWithUsernames = campaigns.map((campaign) => ({
      ...campaign,
      participants: (campaign.participants as string[]).map(
        (id) => userMap[id] || "(unknown user)"
      ),
    }))

    return NextResponse.json(campaignsWithUsernames)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to fetch completed campaigns" },
      { status: 500 }
    )
  }
}
