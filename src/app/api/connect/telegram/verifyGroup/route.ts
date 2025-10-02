import { NextRequest, NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) {
      return NextResponse.json({ error: "Missing group/channel URL" }, { status: 400 })
    }

    // ✅ extract username/group id dari URL
    const match = url.match(/t\.me\/(.+)$/)
    if (!match) {
      return NextResponse.json({ error: "Invalid Telegram URL" }, { status: 400 })
    }
    const usernameOrId = match[1]

    // ✅ ambil info chat
    const chatRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${usernameOrId}`
    )
    const chatData = await chatRes.json()

    if (!chatData.ok) {
      return NextResponse.json(
        { error: "Invalid chat, bot cannot access this group/channel" },
        { status: 400 }
      )
    }

    const chatId = chatData.result.id

    // ✅ ambil info bot sendiri
    const botRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`)
    const botData = await botRes.json()
    const botId = botData.result.id

    // ✅ cek apakah bot sudah join
    const checkBotRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${botId}`
    )
    const checkBotData = await checkBotRes.json()

    if (!checkBotData.ok || checkBotData.result.status === "left") {
      return NextResponse.json(
        {
          valid: false,
          error: "Bot is not in this group/channel. Please add the bot first.",
        },
        { status: 400 }
      )
    }

    // ✅ success
    return NextResponse.json({
      valid: true,
      chatId,
      title: chatData.result.title,
      type: chatData.result.type,
    })
  } catch (err: any) {
    console.error("verifyGroup error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
