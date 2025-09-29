import { fetch } from "undici"

export async function checkTwitterLike(userId, tweetId) {
  const res = await fetch("https://222d5e95f565.ngrok-free.app/check-like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, tweetId }),
  })

  const data = await res.json()
  return data.liked === true
}
