import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import SocialAccount from "@/models/SocialAccount"
import { auth } from "@/auth"

export async function GET() {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const account = await SocialAccount.findOne({ userId: session.user.id, provider: "telegram" })
  if (!account) return NextResponse.json({ connected: false })

  return NextResponse.json({
    connected: true,
    username: account.username,
    profileUrl: account.profileUrl,
  })
}
