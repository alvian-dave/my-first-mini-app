// /lib/like.js
import { fetch } from "undici"

export async function checkTwitterLike(userId: string, tweetId: string) {
  const res = await fetch("http://localhost:3000/check-like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, tweetId }),
  })

  if (!res.ok) {
    throw new Error(`Local check-like failed: ${res.status}`)
  }

  const data = await res.json()
  return data.liked
}
