import { NextResponse } from "next/server"

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const usernameOrId = "@WRC_Community"

  const url = `https://api.telegram.org/bot${token}/getChat?chat_id=${usernameOrId}`

  const res = await fetch(url)
  const data = await res.json()

  return NextResponse.json({ fromServer: true, data })
}
