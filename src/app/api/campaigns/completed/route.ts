import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Campaign } from "@/models/Campaign"
import User from "@/models/User"
import { auth } from "@/auth"
import mongoose from "mongoose"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await dbConnect()

  try {
    // 🔹 Ambil semua campaign yang diikuti user
    const campaigns = await Campaign.find({
      participants: session.user.id,
    })
      .sort({ createdAt: -1 })
      .lean()

    // 🔹 Kumpulkan semua participant ID unik
    const allParticipantIds = [
      ...new Set(
        campaigns.flatMap((c) => (c.participants as string[] | undefined) || [])
      ),
    ]

    // 🔹 Konversi ke ObjectId untuk query user
    const objectIds = allParticipantIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id))

    // 🔹 Ambil user berdasarkan ObjectId
    const users = await User.find({ _id: { $in: objectIds } })
      .select("username _id")
      .lean()

    // 🔹 Buat peta: stringId (hex) → username
    const userMap: Record<string, string> = {}
    users.forEach((u) => {
      userMap[String(u._id)] = u.username || "Anonymous"
    })

    // 🔹 Ganti participant ID menjadi username di setiap campaign
    const campaignsWithUsernames = campaigns.map((campaign) => ({
      ...campaign,
      participants: (campaign.participants as string[]).map(
        (id) => userMap[id] || "(unknown user)"
      ),
    }))

    return NextResponse.json(campaignsWithUsernames)
  } catch (err) {
    console.error("❌ Error fetching completed campaigns:", err)
    return NextResponse.json(
      { error: "Failed to fetch completed campaigns" },
      { status: 500 }
    )
  }
}
