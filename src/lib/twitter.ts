// /src/lib/twitter.ts
import SocialAccount from "@/models/SocialAccount"

const BOT_AUTH_TOKEN = process.env.TWITTER_BOT_AUTH_TOKEN!
const BOT_CSRF = process.env.TWITTER_BOT_CSRF!
const BOT_BEARER = process.env.TWITTER_BOT_BEARER!
const DEV_BEARER = process.env.DEV_BEARER_TOKEN!

function devHeaders() {
  return {
    Authorization: `Bearer ${DEV_BEARER}`,
  }
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
export async function resolveTwitterUserId(
  username: string
): Promise<string | null> {
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
// Check apakah hunter follow target (Bot only)
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

// ─────────────────────────────
// Check apakah hunter like tweet (Bot only)
// ─────────────────────────────
export async function checkTwitterLike(
  userId: string,
  tweetId: string
): Promise<boolean> {
  try {
    const url = `https://api.twitter.com/2/tweets/${tweetId}/liking_users`

    const res = await fetch(url, { headers: botHeaders() })

    if (!res.ok) {
      console.error("checkTwitterLike failed:", res.status, await res.text())
      return false
    }

    const json = await res.json().catch(() => null)
    if (!json?.data) return false

    return json.data.some((u: any) => u.id === userId)
  } catch (e) {
    console.error("checkTwitterLike error:", e)
    return false
  }
}

// ─────────────────────────────
// Check apakah hunter retweet (Bot only)
// ─────────────────────────────
export async function checkTwitterRetweet(
  userId: string,
  tweetId: string
): Promise<boolean> {
  try {
    const url = `https://api.twitter.com/2/tweets/${tweetId}/retweeted_by`

    const res = await fetch(url, { headers: botHeaders() })

    if (!res.ok) {
      console.error("checkTwitterRetweet failed:", res.status, await res.text())
      return false
    }

    const json = await res.json().catch(() => null)
    if (!json?.data) return false

    return json.data.some((u: any) => u.id === userId)
  } catch (e) {
    console.error("checkTwitterRetweet error:", e)
    return false
  }
}
