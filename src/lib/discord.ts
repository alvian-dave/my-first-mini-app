// src/lib/discord.ts
export type DiscordInviteInfo = {
  guildId?: string
  guild?: {
    id?: string
    name?: string
    icon?: string | null
    features?: string[]
  }
  approximate_member_count?: number
  approximate_presence_count?: number
}

/**
 * Resolve a Discord guild id from a task URL or invite link.
 *
 * Accepts:
 * - full invite links: https://discord.gg/xxxxx or https://discord.com/invite/xxxxx
 * - invite codes only: xxxxx
 * - direct guild id (snowflake) (if the URL contains a numeric id path)
 *
 * Returns guildId string or null if can't resolve.
 *
 * Requires a BOT token for fetching invite info (recommended) — pass botToken.
 */
export async function resolveDiscordGuildId(
  urlOrInvite: string,
  botToken?: string
): Promise<string | null> {
  try {
    if (!urlOrInvite) return null

    // normalize
    const trimmed = String(urlOrInvite).trim()

    // 1) If looks like a pure snowflake (all digits, length > 15)
    if (/^\d{16,}$/.test(trimmed)) {
      return trimmed
    }

    // 2) Try parse URL to extract path segments
    let inviteCode: string | null = null
    try {
      const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`)
      // common invite paths: /invite/{code} or direct discord.gg/{code}
      const parts = u.pathname.split("/").filter(Boolean)
      if (parts.length) {
        // if path is like /invite/abc123 => parts[0] === 'invite'
        if (parts[0] === "invite" && parts[1]) inviteCode = parts[1]
        else inviteCode = parts[0]
      }
    } catch (e) {
      // not a url: maybe bare invite code
      if (/^[A-Za-z0-9_-]{2,}$/.test(trimmed)) inviteCode = trimmed
    }

    if (!inviteCode) return null

    // 3) Call Discord invite API to get guild id
    // Endpoint: GET /invites/{invite_code}?with_counts=false&with_expiration=true
    const inviteUrl = `https://discord.com/api/v10/invites/${encodeURIComponent(
      inviteCode
    )}?with_counts=false&with_expiration=true`

    const headers: Record<string, string> = {
      "Accept": "application/json",
    }
    if (botToken) headers["Authorization"] = `Bot ${botToken}`

    const res = await fetch(inviteUrl, { headers })
    if (!res.ok) {
      // If invite invalid or expired, discord returns 404
      // log and return null
      const text = await res.text().catch(() => "")
      console.error("[resolveDiscordGuildId] invite fetch failed", res.status, text)
      return null
    }

    const json = (await res.json().catch(() => null)) as DiscordInviteInfo | null
    const gid = json?.guild?.id ?? (json?.guildId ?? null)
    if (!gid) {
      // Some invites might include guild object at top-level guild.id
      console.warn("[resolveDiscordGuildId] no guild id in invite response", json)
      return null
    }

    return String(gid)
  } catch (err) {
    console.error("resolveDiscordGuildId error:", err)
    return null
  }
}

/**
 * Check if a user (discordUserId) is a member of guild (guildId).
 *
 * Uses Bot token (botToken) to call:
 *  GET /guilds/{guild.id}/members/{user.id}
 *
 * Returns:
 *  - true  => user is member (200)
 *  - false => user not member (404 or status not 'ok')
 *
 * If bot is not in guild or insufficient permissions, the endpoint may return 403.
 * In that case, function returns false but includes console.error for debugging.
 */
export async function checkDiscordMembership(
  discordUserId: string,
  guildId: string,
  botToken: string
): Promise<boolean> {
  try {
    if (!discordUserId || !guildId || !botToken) {
      console.error("[checkDiscordMembership] missing params")
      return false
    }

    const url = `https://discord.com/api/v10/guilds/${encodeURIComponent(
      String(guildId)
    )}/members/${encodeURIComponent(String(discordUserId))}`

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bot ${botToken}`,
        Accept: "application/json",
      },
    })

    if (res.status === 200) {
      // user is a member
      return true
    }

    if (res.status === 404) {
      return false
    }

    // 403 => bot not in guild or missing privileges
    if (res.status === 403) {
      const txt = await res.text().catch(() => "")
      console.error("[checkDiscordMembership] 403 Forbidden — bot may not be in guild or lacks permissions", {
        guildId,
        discordUserId,
        status: res.status,
        body: txt,
      })
      return false
    }

    // other statuses
    const text = await res.text().catch(() => "")
    console.error("[checkDiscordMembership] unexpected response", res.status, text)
    return false
  } catch (err) {
    console.error("checkDiscordMembership error:", err)
    return false
  }
}

/**
 * (Optional helper) Exchange code -> token for Discord (PKCE aware).
 * Returns token JSON or null.
 */
export async function exchangeDiscordCodeForToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret?: string,
  codeVerifier?: string
): Promise<any | null> {
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    })
    if (clientSecret) body.set("client_secret", clientSecret)
    if (codeVerifier) body.set("code_verifier", codeVerifier)

    const res = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error("[exchangeDiscordCodeForToken] failed", res.status, text)
      return null
    }
    const json = await res.json().catch(() => null)
    return json
  } catch (err) {
    console.error("exchangeDiscordCodeForToken error:", err)
    return null
  }
}

/**
 * (Optional helper) Get Discord user profile using access token
 */
export async function getDiscordUserProfile(accessToken: string): Promise<any | null> {
  try {
    const res = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      console.error("[getDiscordUserProfile] failed", res.status, txt)
      return null
    }
    const j = await res.json().catch(() => null)
    return j
  } catch (err) {
    console.error("getDiscordUserProfile error:", err)
    return null
  }
}
