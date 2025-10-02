// /src/app/api/task/verify/telegram/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import SocialAccount from "@/models/SocialAccount"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

export async function POST(req: Request) {
  await dbConnect()
  const { userId, targetId } = await req.json()  
  // targetId = chatId/groupId yg tersimpan di Task DB

  // cari akun telegram hunter
  const account = await SocialAccount.findOne({ userId, provider: "telegram" })
  if (!account || !account.socialId) {
    return NextResponse.json({ verified: false, reason: "Telegram not connected" })
  }

  // cek membership via Telegram API
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${targetId}&user_id=${account.socialId}`
  )
  const data = await res.json()

  if (!data.ok) {
    return NextResponse.json({ verified: false, reason: "Failed to check membership" })
  }

  const status = data.result.status
  const isMember = ["member", "administrator", "creator"].includes(status)

  return NextResponse.json({ verified: isMember })
}
