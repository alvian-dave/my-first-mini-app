// /src/lib/twitter.ts
import SocialAccount from "@/models/SocialAccount"

const BOT_AUTH_TOKEN = process.env.TWITTER_BOT_AUTH_TOKEN!
const BOT_CSRF = process.env.TWITTER_BOT_CSRF!
const BOT_BEARER = process.env.BOT_BEARER!
const DEV_BEARER = process.env.DEV_BEARER_TOKEN!

// Cache queryId per tweet
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
// Ambil queryId Like/Retweet dan cache (refresh otomatis)
// ─────────────────────────────
async function getGraphQLQueryId(tweetId: string, type: "Like" | "Retweet"): Promise<string | null> {
  // Cek cache dulu
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
// Helper GraphQL fetch (stop-on-find + refresh queryId otomatis)
// ─────────────────────────────
async function checkTwitterGraphQL(
  type: "Like" | "Retweet",
  userId: string,
  tweetId: string
): Promise<boolean> {
  try {
    let queryId = await getGraphQLQueryId(tweetId, type)
    if (!queryId) return false

    const endpoint = type === "Like" ? "LikingUsers" : "RetweetedBy"
    let cursor: string | null = null

    do {
      const body = JSON.stringify({
        queryId,
        variables: JSON.stringify({ focalTweetId: tweetId, includePromotedContent: false, count: 100, cursor }),
      })

      const res = await fetch(`https://twitter.com/i/api/graphql/${queryId}/${endpoint}`, {
        method: "POST",
        headers: { ...botHeaders(), "Content-Type": "application/json" },
        body,
      })

      if (res.status === 404) {
        // QueryId expired → refresh otomatis
        queryIdCache[tweetId] = { ...queryIdCache[tweetId], [type]: undefined }
        queryId = await getGraphQLQueryId(tweetId, type)
        if (!queryId) return false
        continue
      }

      if (!res.ok) {
        console.error(`checkTwitter${type} failed:`, res.status, await res.text())
        return false
      }

      const json = await res.json().catch(() => null)
      const users: Array<{ rest_id: string }> =
        type === "Like"
          ? json?.data?.focalTweet?.likedBy?.users ?? []
          : json?.data?.focalTweet?.retweetedBy?.users ?? []

      if (users.some((u) => u.rest_id === userId)) return true

      // ambil cursor selanjutnya jika ada (stop-on-find)
      cursor =
        type === "Like"
          ? json?.data?.focalTweet?.likedBy?.instructions?.[0]?.entries?.find(
              (e: any) => e.entryId.startsWith("cursor-bottom-")
            )?.content?.value ?? null
          : json?.data?.focalTweet?.retweetedBy?.instructions?.[0]?.entries?.find(
              (e: any) => e.entryId.startsWith("cursor-bottom-")
            )?.content?.value ?? null
    } while (cursor)

    return false
  } catch (e) {
    console.error(`checkTwitter${type} error:`, e)
    return false
  }
}

// ─────────────────────────────
// Check hunter like tweet
// ─────────────────────────────
export async function checkTwitterLike(userId: string, tweetId: string): Promise<boolean> {
  return checkTwitterGraphQL("Like", userId, tweetId)
}

// ─────────────────────────────
// Check hunter retweet tweet
// ─────────────────────────────
export async function checkTwitterRetweet(userId: string, tweetId: string): Promise<boolean> {
  return checkTwitterGraphQL("Retweet", userId, tweetId)
}
