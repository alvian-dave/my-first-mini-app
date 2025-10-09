import { NextRequest, NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) {
      return NextResponse.json({ error: "Missing group/channel URL" }, { status: 400 })
    }

    // 🔍 Extract username or ID
    let usernameOrId: string | number | null = null

    // 1️⃣ t.me/username or telegram.me/username
    const matchUsername = url.match(/(?:t\.me\/|telegram\.me\/)([a-zA-Z0-9_]+)/)
    if (matchUsername) usernameOrId = matchUsername[1]

    // 2️⃣ Direct numeric ID input
    else if (/^-?\d+$/.test(url)) usernameOrId = Number(url)

    // 3️⃣ t.me/joinchat or +inviteLink → cannot be verified
    else if (url.includes("joinchat") || url.includes("+")) {
      return NextResponse.json({
        error:
          "Invite links (t.me/joinchat/ or t.me/+) cannot be verified. Please use a public username (e.g. https://t.me/groupname).",
      }, { status: 400 })
    }

    if (!usernameOrId) {
      return NextResponse.json({ error: "Invalid Telegram URL format" }, { status: 400 })
    }

    // 🧩 Fetch chat info
    const chatRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${usernameOrId}`,
      { cache: "no-store" }
    )
    const chatData = await chatRes.json()

    if (!chatData.ok) {
      console.log("getChat failed:", chatData)
      return NextResponse.json(
        { error: "Invalid chat or bot cannot access this group/channel" },
        { status: 400 }
      )
    }

    const chatId = chatData.result.id

    // 🧩 Fetch bot info
    const botRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`,
      { cache: "no-store" }
    )
    const botData = await botRes.json()
    if (!botData.ok) {
      return NextResponse.json({ error: "Invalid bot token" }, { status: 401 })
    }

    const botId = botData.result.id

    // 🧩 Check bot membership
    const checkRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${botId}`,
      { cache: "no-store" }
    )
    const checkData = await checkRes.json()

    if (!checkData.ok || !checkData.result || checkData.result.status === "left") {
      console.log("Bot not found in group:", checkData)
      return NextResponse.json(
        { valid: false, error: "Bot is not in this group/channel. Please add the bot first." },
        { status: 400 }
      )
    }

    // ✅ Success
    return NextResponse.json({
      valid: true,
      chatId,
      title: chatData.result.title,
      type: chatData.result.type,
    })
  } catch (err) {
    console.error("verifyGroup error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
