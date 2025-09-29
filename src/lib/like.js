import { fetch } from "undici"

export async function checkTwitterLike(userId, tweetId) {
  const res = await fetch("http://localhost:3000/check-like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, tweetId }),
  })

  const data = await res.json()
  return data.liked === true
}
