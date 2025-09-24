// /src/lib/twitter.ts
import SocialAccount from "@/models/SocialAccount"

const BOT_AUTH_TOKEN = process.env.TWITTER_BOT_AUTH_TOKEN!
const BOT_CSRF = process.env.TWITTER_BOT_CSRF!
const BOT_BEARER = process.env.BOT_BEARER!
const DEV_BEARER = process.env.DEV_BEARER_TOKEN!
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!

function devHeaders() {
  return { Authorization: `Bearer ${DEV_BEARER}` }
}

function botHeaders() {
  return {
    Authorization: `Bearer ${BOT_BEARER}`,
    Cookie: `auth_token=${BOT_AUTH_TOKEN}; ct0=${BOT_CSRF}`,
    "x-csrf-token": BOT_CSRF,
  }
}

// ─────────────────────────────
// Resolve userId dari username (Bot only)
// ─────────────────────────────
export async function resolveTwitterUserId(username: string): Promise<string | null> {
  const clean = username
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//, "")
    .replace(/\/+$/, "")
    .split(/[/?]/)[0]
    .toLowerCase()

  try {
    const res = await fetch(`https://api.twitter.com/2/users/by/username/${clean}`, {
      headers: devHeaders(),
    })
    if (!res.ok) {
      console.error("resolveTwitterUserId failed:", clean, res.status, await res.text())
      return null
    }
    const json = await res.json()
    return json?.data?.id ?? null
  } catch (e) {
    console.error("resolveTwitterUserId error:", e)
    return null
  }
}

// ─────────────────────────────
// Check hunter follow target (Bot only)
// ─────────────────────────────
export async function checkTwitterFollow(social: any, targetId: string): Promise<boolean> {
  try {
    const sourceId = social.socialId
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

// ─────────────────────────────
// Helper: ambil & refresh access token user
// ─────────────────────────────
async function getUserAccessToken(userId: string): Promise<string | null> {
  try {
    const account = await SocialAccount.findOne({ userId, provider: "twitter" })
    if (!account) return null

    // kalau belum expired → langsung pakai
    if (account.expiresAt && account.expiresAt > new Date()) {
      return account.accessToken
    }

    // kalau ada refreshToken → refresh token pakai confidential client
    if (account.refreshToken) {
      try {
        const basicAuth = Buffer.from(
          `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`
        ).toString("base64")

        const body = new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: account.refreshToken,
        })

        const res = await fetch("https://api.twitter.com/2/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${basicAuth}`,
          },
          body: body.toString(),
        })

        if (!res.ok) {
          console.error("refreshToken failed:", res.status, await res.text())
          return null
        }

        const json = await res.json().catch(() => null)
        if (!json?.access_token) return null

        // update DB
        account.accessToken = json.access_token
        if (json.refresh_token) account.refreshToken = json.refresh_token
        if (json.expires_in) {
          account.expiresAt = new Date(Date.now() + json.expires_in * 1000)
        }
        await account.save()

        return account.accessToken
      } catch (e) {
        console.error("getUserAccessToken refresh error:", e)
        return null
      }
    }

    return null
  } catch (e) {
    console.error("getUserAccessToken error:", e)
    return null
  }
}

// ─────────────────────────────
// Check hunter like tweet (Twitter API v2)
// ─────────────────────────────
export async function checkTwitterLike(userId: string, tweetId: string): Promise<boolean> {
  try {
    const accessToken = await getUserAccessToken(userId)
    if (!accessToken) {
      console.error("checkTwitterLike: no access token for user", userId)
      return false
    }

    const res = await fetch(`https://api.twitter.com/2/users/${userId}/liked_tweets`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      console.error("checkTwitterLike failed:", res.status, await res.text())
      return false
    }

    const json = await res.json().catch(() => null)
    const liked = json?.data?.some((t: any) => t.id === tweetId) ?? false
    return liked
  } catch (e) {
    console.error("checkTwitterLike error:", e)
    return false
  }
}

// ─────────────────────────────
// Check hunter retweet tweet (Twitter API v2)
// ─────────────────────────────
export async function checkTwitterRetweet(userId: string, tweetId: string): Promise<boolean> {
  try {
    const accessToken = await getUserAccessToken(userId)
    if (!accessToken) {
      console.error("checkTwitterRetweet: no access token for user", userId)
      return false
    }

    const res = await fetch(`https://api.twitter.com/2/tweets/${tweetId}/retweeted_by`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      console.error("checkTwitterRetweet failed:", res.status, await res.text())
      return false
    }

    const json = await res.json().catch(() => null)
    const retweeted = json?.data?.some((u: any) => u.id === userId) ?? false
    return retweeted
  } catch (e) {
    console.error("checkTwitterRetweet error:", e)
    return false
  }
}
