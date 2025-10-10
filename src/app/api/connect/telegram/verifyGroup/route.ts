import { NextRequest, NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

function maskToken(t?: string | null) {
  if (!t) return null
  return `${t.slice(0, 6)}...${t.slice(-4)}`
}

function normalizeTelegramInput(rawInput: string) {
  const original = String(rawInput ?? "").trim()
  let s = original
  try {
    s = decodeURIComponent(s)
  } catch (e) {
    // ignore
  }
  s = s.replace(/\s+/g, "").replace(/\/+$/, "") // remove whitespace and trailing slashes

  // Detect invite links early
  if (s.toLowerCase().includes("joinchat") || /\+/.test(s)) {
    return { type: "invite", normalized: s, original }
  }

  // URL forms: https://t.me/username or https://telegram.me/username (with or without protocol)
  const urlMatch = s.match(/(?:https?:\/\/)?(?:t\.me\/|telegram\.me\/)(@?[a-zA-Z0-9_]+)/i)
  if (urlMatch) {
    const username = urlMatch[1]
    return { type: "username", normalized: username, original }
  }

  // @username
  const atMatch = s.match(/^@([a-zA-Z0-9_]+)$/)
  if (atMatch) {
    return { type: "username", normalized: `@${atMatch[1]}`, original }
  }

  // pure username without @ (e.g. WRC_Community)
  if (/^[a-zA-Z0-9_]+$/.test(s)) {
    return { type: "username", normalized: s, original }
  }

  // numeric chat id (e.g. -1001234567890)
  if (/^-?\d+$/.test(s)) {
    return { type: "id", normalized: Number(s), original }
  }

  return { type: "unknown", normalized: s, original }
}

export async function POST(req: NextRequest) {
  const debugRequested = req.headers.get("x-debug") === "1" || process.env.NODE_ENV !== "production"
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
  const userAgent = req.headers.get("user-agent") || ""

  try {
    // Read body safely
    let body: any = {}
    try {
      body = await req.json()
    } catch (e) {
      // fallthrough
    }

    const rawUrl = body?.url ?? ""

    console.info("[verifyGroup] incoming request", {
      rawUrl,
      clientIp,
      userAgent,
      env: process.env.NODE_ENV,
      tokenPreview: maskToken(TELEGRAM_BOT_TOKEN),
      debugRequested,
    })

    if (!rawUrl) {
      return NextResponse.json({ error: "Missing group/channel URL" }, { status: 400 })
    }

    const parsed = normalizeTelegramInput(String(rawUrl))
    console.info("[verifyGroup] parsed input", parsed)

    if (parsed.type === "invite") {
      return NextResponse.json(
        {
          error:
            "Invite links (t.me/joinchat/ or t.me/+) cannot be verified. Please use a public username (e.g. https://t.me/groupname).",
          debug: debugRequested ? { parsed } : undefined,
        },
        { status: 400 }
      )
    }

    if (parsed.type === "unknown") {
      return NextResponse.json({ error: "Invalid Telegram URL format" }, { status: 400 })
    }

    // Build a prioritized list of identifiers to try with getChat
    let tryIdentifiers: (string | number)[] = []
    if (parsed.type === "id") {
      tryIdentifiers = [parsed.normalized]
    } else if (parsed.type === "username") {
      const u = String(parsed.normalized)
      // try as-is, then with @ prefix (if missing)
      tryIdentifiers = [u]
      if (!u.startsWith("@")) tryIdentifiers.push("@" + u)
    }

    const attempts: any[] = []
    let chatData: any = null

    for (const id of tryIdentifiers) {
      // Mask token when logging; do not print the full token
      const maskedToken = maskToken(TELEGRAM_BOT_TOKEN)
      console.info("[verifyGroup] getChat attempt", { id, maskedToken })

      const chatUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${encodeURIComponent(String(id))}`
      let res
      try {
        res = await fetch(chatUrl, { cache: "no-store" })
      } catch (err) {
        console.warn("[verifyGroup] network/getChat fetch error", { id, err: String(err) })
        attempts.push({ id, fetchError: String(err) })
        continue
      }

      let data
      try {
        data = await res.json()
      } catch (err) {
        attempts.push({ id, httpStatus: res.status, parseError: String(err) })
        continue
      }

      attempts.push({ id, httpStatus: res.status, dataSummary: { ok: data?.ok ?? false, description: data?.description } })

      if (data && data.ok) {
        chatData = data
        break
      }
    }

    if (!chatData) {
      console.warn("[verifyGroup] getChat failed", { attempts })
      if (debugRequested) return NextResponse.json({ error: "Invalid chat or bot cannot access this group/channel", debug: { parsed, attempts } }, { status: 400 })
      return NextResponse.json({ error: "Invalid chat or bot cannot access this group/channel" }, { status: 400 })
    }

    const chatId = chatData.result.id

    // getMe (bot info)
    const botRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`, { cache: "no-store" })
    const botData = await botRes.json()
    if (!botData.ok) {
      console.warn("[verifyGroup] getMe failed", { botData })
      return NextResponse.json({ error: "Invalid bot token" }, { status: 401 })
    }

    const botId = botData.result.id

    // getChatMember: check bot membership
    const memberRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${botId}`,
      { cache: "no-store" }
    )
    const memberData = await memberRes.json()

    if (!memberData.ok) {
      console.warn("[verifyGroup] getChatMember failed", { memberData })
      if (debugRequested) return NextResponse.json({ valid: false, error: "Bot not found in group (getChatMember returned error)", debug: { parsed, chatData, memberData } }, { status: 400 })
      return NextResponse.json({ valid: false, error: "Bot is not in this group/channel. Please add the bot first." }, { status: 400 })
    }

    const botStatus = memberData.result?.status
    if (botStatus === "left" || botStatus === "kicked") {
      console.warn("[verifyGroup] bot not active in group", { botStatus })
      return NextResponse.json({ valid: false, error: "Bot is not in this group/channel. Please add the bot first." }, { status: 400 })
    }

    const success = {
      valid: true,
      chatId,
      title: chatData.result.title,
      type: chatData.result.type,
    }

    if (debugRequested) {
      // Attach helpful debug info but don't include the raw bot token
      ;(success as any).debug = {
        parsed,
        attempts,
        chatData: {
          ok: chatData.ok,
          id: chatData.result?.id,
          title: chatData.result?.title,
          username: chatData.result?.username,
          type: chatData.result?.type,
        },
        memberDataSummary: { ok: memberData.ok, status: memberData.result?.status },
        botInfo: { id: botData.result?.id, username: botData.result?.username },
        tokenPreview: maskToken(TELEGRAM_BOT_TOKEN),
      }
    }

    return NextResponse.json(success)
  } catch (err) {
    console.error("[verifyGroup] unexpected error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
