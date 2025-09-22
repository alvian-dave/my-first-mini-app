// /src/lib/twitter.ts
import SocialAccount from "@/models/SocialAccount"

const BOT_AUTH_TOKEN = process.env.TWITTER_BOT_AUTH_TOKEN!
const BOT_CSRF = process.env.TWITTER_BOT_CSRF!
const BOT_BEARER = process.env.BOT_BEARER!
const DEV_BEARER = process.env.DEV_BEARER_TOKEN!

const queryIdCache: Record<string, { Like?: string; Retweet?: string }> = {}

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
// Ambil queryId Like/Retweet dan cache
// ─────────────────────────────
async function getGraphQLQueryId(tweetId: string, type: "Like" | "Retweet"): Promise<string | null> {
  if (queryIdCache[tweetId]?.[type]) return queryIdCache[tweetId][type]!

  try {
    const res = await fetch(`https://twitter.com/i/api/2/timeline/conversation/${tweetId}.json`, {
      headers: botHeaders(),
    })
    if (!res.ok) return null
    const json = await res.json()
    const instructions = json?.timeline?.instructions ?? []

    for (const inst of instructions) {
      if (!inst?.entries) continue
      for (const entry of inst.entries) {
        const op = entry?.content?.operation
        if (op?.operationType === "Query" && op?.name) {
          if (type === "Like" && op.name.toLowerCase().includes("liking_users")) {
            queryIdCache[tweetId] = queryIdCache[tweetId] || {}
            queryIdCache[tweetId][type] = op.name
            return op.name
          }
          if (type === "Retweet" && op.name.toLowerCase().includes("retweeted_by")) {
            queryIdCache[tweetId] = queryIdCache[tweetId] || {}
            queryIdCache[tweetId][type] = op.name
            return op.name
          }
        }
      }
    }
    return null
  } catch (e) {
    console.error("getGraphQLQueryId error:", e)
    return null
  }
}

// ─────────────────────────────
// Check hunter like tweet (stop-on-find)
// ─────────────────────────────
export async function checkTwitterLike(userId: string, tweetId: string): Promise<boolean> {
  try {
    const queryId = await getGraphQLQueryId(tweetId, "Like")
    if (!queryId) return false

    let cursor: string | null = null
    do {
      const body: string = JSON.stringify({
        queryId: queryId,
        variables: JSON.stringify({
          focalTweetId: tweetId,
          includePromotedContent: false,
          count: 100,
          cursor: cursor,
        }),
      })
      const res = await fetch(`https://twitter.com/i/api/graphql/${queryId}/LikingUsers`, {
        method: "POST",
        headers: { ...botHeaders(), "Content-Type": "application/json" },
        body: body,
      })
      if (!res.ok) {
        console.error("checkTwitterLike failed:", res.status, await res.text())
        return false
      }

      const json = await res.json().catch(() => null)
      const users: Array<{ rest_id: string }> = json?.data?.focalTweet?.likedBy?.users ?? []
      if (users.some((u) => u.rest_id === userId)) return true

      cursor =
        json?.data?.focalTweet?.likedBy?.instructions?.[0]?.entries?.find(
          (e: any) => e.entryId.startsWith("cursor-bottom-")
        )?.content?.value ?? null
    } while (cursor)

    return false
  } catch (e) {
    console.error("checkTwitterLike error:", e)
    return false
  }
}

// ─────────────────────────────
// Check hunter retweet tweet (stop-on-find)
// ─────────────────────────────
export async function checkTwitterRetweet(userId: string, tweetId: string): Promise<boolean> {
  try {
    const queryId = await getGraphQLQueryId(tweetId, "Retweet")
    if (!queryId) return false

    let cursor: string | null = null
    do {
      const body: string = JSON.stringify({
        queryId: queryId,
        variables: JSON.stringify({
          focalTweetId: tweetId,
          includePromotedContent: false,
          count: 100,
          cursor: cursor,
        }),
      })
      const res = await fetch(`https://twitter.com/i/api/graphql/${queryId}/RetweetedBy`, {
        method: "POST",
        headers: { ...botHeaders(), "Content-Type": "application/json" },
        body: body,
      })
      if (!res.ok) {
        console.error("checkTwitterRetweet failed:", res.status, await res.text())
        return false
      }

      const json = await res.json().catch(() => null)
      const users: Array<{ rest_id: string }> = json?.data?.focalTweet?.retweetedBy?.users ?? []
      if (users.some((u) => u.rest_id === userId)) return true

      cursor =
        json?.data?.focalTweet?.retweetedBy?.instructions?.[0]?.entries?.find(
          (e: any) => e.entryId.startsWith("cursor-bottom-")
        )?.content?.value ?? null
    } while (cursor)

    return false
  } catch (e) {
    console.error("checkTwitterRetweet error:", e)
    return false
  }
}
