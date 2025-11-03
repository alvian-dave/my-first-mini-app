import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Campaign } from "@/models/Campaign"
import User from "@/models/User" // 🟢 Tambahkan import ini
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
    }).sort({ createdAt: -1 }).lean() // 🟢 gunakan .lean() agar bisa manipulasi data langsung

    // 🟩 Ubah participants dari ObjectId → username
    const campaignWithUsernames = await Promise.all(
      campaigns.map(async (campaign) => {
        if (campaign.participants?.length) {
          const users = await User.find({ _id: { $in: campaign.participants } })
            .select("username") // hanya ambil username
            .lean()

          const usernames = users.map((u) => u.username || "Anonymous")

          return {
            ...campaign,
            participants: usernames, // hanya tampil username
          }
        } else {
          return {
            ...campaign,
            participants: [], // kosong kalau belum ada
          }
        }
      })
    )

    return NextResponse.json(campaignWithUsernames)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to fetch completed campaigns" },
      { status: 500 }
    )
  }
}
