// /src/lib/twitter.ts
import SocialAccount from "@/models/SocialAccount"

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

export async function resolveTwitterUserId(username: string, token: string): Promise<string | null> {
  // Normalisasi username: buang @ dan slash di akhir
  const clean = username.replace(/^@/, "").replace(/\/+$/, "")

  const res = await fetch(`https://api.twitter.com/2/users/by/username/${clean}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    console.error("resolveTwitterUserId failed:", res.status, await res.text())
    return null
  }

  const json = await res.json().catch(() => null)
  return json?.data?.id ?? null
}

export async function checkTwitterFollow(
  social: any,
  targetId: string
): Promise<boolean> {
  let token = social.accessToken

  async function doCheck(tokenToUse: string) {
    return fetch(
      `https://api.twitter.com/2/users/${social.socialId}/following/${targetId}`,
      { headers: { Authorization: `Bearer ${tokenToUse}` } }
    )
  }

  let res = await doCheck(token)
  if (res.status === 401) {
    // token expired, coba refresh
    token = await refreshTwitterToken(social)
    res = await doCheck(token)
  }

  if (res.status === 200) return true
  if (res.status === 404) return false

  const err = await res.text().catch(() => "")
  throw new Error(`Twitter API follow check error: ${res.status} ${err}`)
}
