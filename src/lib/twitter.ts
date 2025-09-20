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

export async function resolveTwitterUserId(
  username: string,
  token: string,
  social?: any
): Promise<string | null> {
  const clean = username.replace(/^@/, "").replace(/\/+$/, "")

  async function doResolve(tokenToUse: string) {
    const res = await fetch(
      `https://api.twitter.com/2/users/by/username/${clean}`,
      { headers: { Authorization: `Bearer ${tokenToUse}` } }
    )

    if (!res.ok) {
      console.error(
        "resolveTwitterUserId failed:",
        res.status,
        await res.text()
      )
      return { ok: false, status: res.status, data: null }
    }

    const json = await res.json().catch(() => null)
    return { ok: true, status: res.status, data: json?.data ?? null }
  }

  // coba pertama
  let result = await doResolve(token)

  // kalau 401 → refresh token
  if (result.status === 401 && social) {
    try {
      const newToken = await refreshTwitterToken(social)
      result = await doResolve(newToken)
    } catch (e) {
      console.error("refreshTwitterToken failed:", e)
      return null
    }
  }

  if (!result.ok || !result.data) return null
  return result.data.id
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
