// like.ts
import fetch from "node-fetch"

const AUTH_BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
const CSRF_TOKEN =
  "c7221c7b45aefdd8e198b2479ca3cb0a0e6b82d0e6a79a7e6cde61697fdfc630d860e10d2b92b26749a2966d534e97c8e4a6f6f30a8775f2c855fa3ad055fa036d823c802a90974b3f8c16389c6b3502"
const COOKIE = `auth_token=768bd7a0ba6de3ecad8c0bdcbecfab84ba5dfcf7; ct0=${CSRF_TOKEN}`

export async function checkTwitterLike(
  userId: string,
  tweetId: string
): Promise<boolean> {
  const url = `https://x.com/i/api/graphql/LJcJgGhFdz9zGTu13IlSBA/Favoriters?variables=${encodeURIComponent(
    JSON.stringify({
      tweetId,
      count: 20,
      enableRanking: true,
      includePromotedContent: true,
    })
  )}&features=${encodeURIComponent(
    JSON.stringify({
      responsive_web_graphql_timeline_navigation_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
    })
  )}`

  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${AUTH_BEARER}`,
      "x-csrf-token": CSRF_TOKEN,
      cookie: COOKIE,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "x-twitter-active-user": "yes",
      "x-twitter-client-language": "en",
      referer: `https://x.com/i/web/status/${tweetId}`,
    },
  })

  const data = await res.json()

  const entries =
    data?.data?.favoriters_timeline?.timeline?.instructions?.flatMap(
      (i: any) => i.entries || []
    ) || []

  const users: string[] = entries
    .filter((e: any) => e?.content?.itemContent?.itemType === "TimelineUser")
    .map(
      (e: any) => e.content.itemContent.user_results.result.rest_id as string
    )

  return users.includes(userId)
}
