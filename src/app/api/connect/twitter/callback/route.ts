// /src/app/api/connect/twitter/callback/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import SocialAccount from "@/models/SocialAccount"

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI!
const APP_URL = process.env.AUTH_URL || "http://localhost:3000"

interface TwitterTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

interface TwitterUserResponse {
  data?: {
    id: string
    username: string
    name?: string
  }
  errors?: any
}

export async function GET(req: Request) {
  await dbConnect()

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 }
    )
  }

  // ✅ Cari record sementara (state + code_verifier) yang dibuat di /start
  const temp = await SocialAccount.findOne({
    provider: "twitter_temp",
    state,
  })
  if (!temp || !temp.userId || !temp.codeVerifier) {
    return NextResponse.json(
      { error: "Invalid or expired state" },
      { status: 400 }
    )
  }

  // ✅ Tukar code → access_token pakai client_secret (Confidential Client)
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: TWITTER_REDIRECT_URI,
    code_verifier: temp.codeVerifier, // PKCE masih dipakai walau confidential
  })

  const basicAuth = Buffer.from(
    `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`
  ).toString("base64")

  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`, // << wajib untuk confidential client
    },
    body: body.toString(),
  })

  const tokenJson = (await tokenRes.json().catch(() => null)) as
    | TwitterTokenResponse
    | null

  if (!tokenRes.ok || !tokenJson?.access_token) {
    return NextResponse.json(
      { error: "Failed to get access token", details: tokenJson },
      { status: 400 }
    )
  }

  // ✅ Ambil info akun Twitter user
  const userRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  })

  const userJson = (await userRes.json().catch(() => null)) as
    | TwitterUserResponse
    | null

  if (!userRes.ok || !userJson?.data?.id || !userJson.data.username) {
    return NextResponse.json(
      { error: "Failed to fetch Twitter profile", details: userJson },
      { status: 400 }
    )
  }

  const userData = userJson.data

  // ✅ Simpan permanen ke SocialAccount
  await SocialAccount.updateOne(
    { userId: temp.userId, provider: "twitter" },
    {
      $set: {
        accessToken: tokenJson.access_token,
        refreshToken: tokenJson.refresh_token,
        expiresAt: tokenJson.expires_in
          ? new Date(Date.now() + tokenJson.expires_in * 1000)
          : null,
        socialId: userData.id,
        username: userData.username,
        profileUrl: `https://twitter.com/${userData.username}`,
        scope: tokenJson.scope ? tokenJson.scope.split(" ") : [],
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )

  // ✅ Hapus record temporary
  await SocialAccount.deleteOne({ _id: temp._id })

  // ✅ Redirect balik ke FE
  const successUrl = new URL(
    `/twitter-success?status=connected&user=${userData.username}`,
    APP_URL
  )
  return NextResponse.redirect(successUrl)
}
