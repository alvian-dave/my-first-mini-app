import { NextRequest, NextResponse } from "next/server"

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!

function maskToken(t?: string | null) {
  if (!t) return null
  return `${t.slice(0, 6)}...${t.slice(-4)}`
}

function normalizeDiscordInput(rawInput: string) {
  const original = String(rawInput ?? "").trim()
  let s = original
  try {
    s = decodeURIComponent(s)
  } catch (e) {
    // ignore
  }
  s = s.replace(/\s+/g, "").replace(/\/+$/, "") // remove whitespace and trailing slashes

  // example: https://discord.gg/invitecode
  const inviteMatch = s.match(/(?:https?:\/\/)?discord\.gg\/([a-zA-Z0-9]+)/i)
  if (inviteMatch) {
    return { type: "invite", normalized: inviteMatch[1], original }
  }

  // example: https://discord.com/invite/invitecode
  const altInviteMatch = s.match(/(?:https?:\/\/)?discord\.com\/invite\/([a-zA-Z0-9]+)/i)
  if (altInviteMatch) {
    return { type: "invite", normalized: altInviteMatch[1], original }
  }

  // if pure code
  if (/^[a-zA-Z0-9]+$/.test(s)) {
    return { type: "invite", normalized: s, original }
  }

  // numeric guild ID
  if (/^\d+$/.test(s)) {
    return { type: "id", normalized: s, original }
  }

  return { type: "unknown", normalized: s, original }
}

export async function POST(req: NextRequest) {
  const debugRequested = req.headers.get("x-debug") === "1" || process.env.NODE_ENV !== "production"
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
  const userAgent = req.headers.get("user-agent") || ""

  try {
    let body: any = {}
    try {
      body = await req.json()
    } catch (e) {
      // ignore
    }

    const rawUrl = body?.url ?? ""

    console.info("[verifyServer] incoming request", {
      rawUrl,
      clientIp,
      userAgent,
      env: process.env.NODE_ENV,
      tokenPreview: maskToken(DISCORD_BOT_TOKEN),
      debugRequested,
    })

    if (!rawUrl) {
      return NextResponse.json({ error: "Missing Discord server URL or invite link" }, { status: 400 })
    }

    const parsed = normalizeDiscordInput(String(rawUrl))
    console.info("[verifyServer] parsed input", parsed)

    if (parsed.type === "unknown") {
      return NextResponse.json({ error: "Invalid Discord URL format" }, { status: 400 })
    }

    const attempts: any[] = []
    let guildData: any = null

    // Step 1: if invite link → resolve invite
    if (parsed.type === "invite") {
      const inviteCode = parsed.normalized
      const inviteUrl = `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`

      try {
        const res = await fetch(inviteUrl, { cache: "no-store" })
        const data = await res.json()
        attempts.push({ inviteCode, httpStatus: res.status, ok: data?.guild ? true : false, guildId: data?.guild?.id })
        if (data?.guild?.id) {
          guildData = data.guild
        } else {
          console.warn("[verifyServer] invalid invite or bot not in server", { data })
        }
      } catch (err) {
        attempts.push({ inviteCode, fetchError: String(err) })
      }
    }

    // Step 2: if numeric ID → try to fetch guild directly
    if (!guildData && parsed.type === "id") {
      const guildId = parsed.normalized
      try {
        const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        })
        const guildInfo = await guildRes.json()
        attempts.push({ guildId, httpStatus: guildRes.status, ok: guildInfo?.id ? true : false })
        if (guildRes.ok && guildInfo.id) guildData = guildInfo
      } catch (err) {
        attempts.push({ guildId, fetchError: String(err) })
      }
    }

    if (!guildData) {
      console.warn("[verifyServer] guild not found or bot missing permissions", { attempts })
      return NextResponse.json(
        {
          valid: false,
          error: "Cannot verify this Discord server. Please make sure the WR Platform bot has been added to your server before publishing this campaign.",
          debug: debugRequested ? { parsed, attempts } : undefined,
        },
        { status: 400 }
      )
    }

    // Step 3: double-check bot presence (guilds where bot joined)
    const botGuildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    })
    const botGuilds = await botGuildsRes.json()

    const botInServer = Array.isArray(botGuilds) && botGuilds.some((g) => g.id === guildData.id)

    if (!botInServer) {
      console.warn("[verifyServer] bot not in this guild", { guildId: guildData.id })
      return NextResponse.json(
        {
          valid: false,
          error:
            "Bot is not in this Discord server. Please invite the WR Platform bot to your server first.",
          debug: debugRequested ? { parsed, guildData, attempts } : undefined,
        },
        { status: 400 }
      )
    }

    const success = {
      valid: true,
      guildId: guildData.id,
      name: guildData.name,
      type: "discord_server",
    }

    if (debugRequested) {
      ;(success as any).debug = {
        parsed,
        guildData: { id: guildData.id, name: guildData.name },
        tokenPreview: maskToken(DISCORD_BOT_TOKEN),
        attempts,
      }
    }

    return NextResponse.json(success)
  } catch (err) {
    console.error("[verifyServer] unexpected error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
