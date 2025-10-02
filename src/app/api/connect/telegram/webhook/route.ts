// /src/app/api/connect/telegram/webhook/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import SocialAccount from "@/models/SocialAccount"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

export async function POST(req: Request) {
  await dbConnect()
  const body = await req.json()

  if (body.message?.text?.startsWith("/start")) {
    const parts = body.message.text.split(" ")
    const sessionId = parts[1] // ini userId dari sistem kita

    if (!sessionId) {
      return NextResponse.json({ ok: true })
    }

    // Simpan akun telegram ke DB
    await SocialAccount.updateOne(
      { userId: sessionId, provider: "telegram" },
      {
        $set: {
          socialId: String(body.message.from.id),
          username: body.message.from.username,
          profileUrl: `https://t.me/${body.message.from.username}`,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )

    // Balas user via Telegram API
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: body.message.chat.id,
        text: "✅ Your account has been connected!",
      }),
    })
  }

  return NextResponse.json({ ok: true })
}
