// /src/lib/twitter.ts
import SocialAccount from "@/models/SocialAccount"

const BOT_AUTH_TOKEN = process.env.TWITTER_BOT_AUTH_TOKEN!
const BOT_CSRF = process.env.TWITTER_BOT_CSRF!
const BOT_BEARER = process.env.TWITTER_BOT_BEARER!

function botHeaders() {
  return {
    Authorization: `Bearer ${BOT_BEARER}`,
    Cookie: `auth_token=${BOT_AUTH_TOKEN}; ct0=${BOT_CSRF}`,
    "x-csrf-token": BOT_CSRF,
  }
}

// ─────────────────────────────
// Token refresh (tetap ada, kalau pakai OAuth2 v2 hunter login)
// ─────────────────────────────
export async function refreshTwitterToken(account: any): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
    client_id: process.env.TWITTER_CLIENT_ID!,
  })

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  const json = await res.json()
  if (!("access_token" in json)) {
    throw new Error("Failed to refresh Twitter token")
  }

  account.accessToken = json.access_token
  if (json.refresh_token) {
    account.refreshToken = json.refresh_token
  }
  account.expiresAt = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000)
    : null

  await account.save()
  return account.accessToken
}

// ─────────────────────────────
// Resolve userId dari username
// ─────────────────────────────
export async function resolveTwitterUserId(
  username: string,
  token: string,
  social?: any
): Promise<string | null> {
  // Normalisasi username
  const clean = username
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//, "")
    .replace(/\/+$/, "")
    .split(/[/?]/)[0]
    .toLowerCase()

  // Fungsi pakai API v2
  async function doResolve(tokenToUse: string) {
    const res = await fetch(
      `https://api.twitter.com/2/users/by/username/${clean}`,
      { headers: { Authorization: `Bearer ${tokenToUse}` } }
    )
    if (!res.ok) {
      console.error("resolveTwitterUserId v2 failed:", clean, res.status)
      return null
    }
    const json = await res.json().catch(() => null)
    return json?.data?.id ?? null
  }

  // Coba pakai token hunter dulu
  let userId = await doResolve(token)

  // Kalau 401 → refresh
  if (!userId && social) {
    try {
      const newToken = await refreshTwitterToken(social)
      userId = await doResolve(newToken)
    } catch (e) {
      console.error("refreshTwitterToken failed:", e)
    }
  }

  // Kalau masih gagal → fallback ke bot scraper
  if (!userId) {
    try {
      const res = await fetch(
        `https://api.twitter.com/2/users/by/username/${clean}`,
        { headers: botHeaders() }
      )
      const json = await res.json().catch(() => null)
      userId = json?.data?.id ?? null
    } catch (e) {
      console.error("bot resolveTwitterUserId failed:", e)
    }
  }

  return userId
}

// ─────────────────────────────
// Check apakah hunter follow target (pakai bot scraper!)
// ─────────────────────────────
export async function checkTwitterFollow(
  social: any,
  targetId: string
): Promise<boolean> {
  try {
    const sourceId = social.socialId // id hunter dari DB

    const url = `https://api.twitter.com/1.1/friendships/show.json?source_id=${sourceId}&target_id=${targetId}`

    const res = await fetch(url, { headers: botHeaders() })

    if (!res.ok) {
      console.error("checkTwitterFollow failed:", res.status, await res.text())
      return false
    }

    const json = await res.json().catch(() => null)
    return json?.relationship?.source?.following === true
  } catch (e) {
    console.error("checkTwitterFollow error:", e)
    return false
  }
}
