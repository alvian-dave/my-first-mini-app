import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Campaign } from "@/models/Campaign"
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

    return NextResponse.json(campaigns)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to fetch completed campaigns" },
      { status: 500 }
    )
  }
}
