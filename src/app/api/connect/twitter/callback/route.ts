// /api/connect/twitter/callback.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import SocialAccount from "@/models/SocialAccount"
import fetch from "node-fetch"

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export async function GET(req: Request) {
  await dbConnect()

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 })
  }

  // ✅ Ambil temporary record dari DB menggunakan state
  const temp = await SocialAccount.findOne({
    provider: "twitter_temp",
    state,
  })
  if (!temp || !temp.userId || !temp.codeVerifier) {
    return NextResponse.json({ error: "Invalid or expired state" }, { status: 400 })
  }

  // ✅ Tukar code dengan access token (PKCE flow → tanpa client_secret)
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: TWITTER_CLIENT_ID!,
    redirect_uri: TWITTER_REDIRECT_URI!,
    code_verifier: temp.codeVerifier,
  })

  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })

  const tokenJson = await tokenRes.json()
  if (
    typeof tokenJson !== "object" ||
    tokenJson === null ||
    !("access_token" in tokenJson) ||
    typeof (tokenJson as any).access_token !== "string"
  ) {
    return NextResponse.json({ error: "Failed to get access token", details: tokenJson }, { status: 400 })
  }

  const tokenData = tokenJson as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  // ✅ Ambil info akun Twitter
  const userRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  })
  const userJson = await userRes.json()
  if (
    typeof userJson !== "object" ||
    userJson === null ||
    !("data" in userJson) ||
    !("id" in (userJson as any).data) ||
    !("username" in (userJson as any).data)
  ) {
    return NextResponse.json({ error: "Failed to fetch Twitter profile", details: userJson }, { status: 400 })
  }

  const userData = (userJson as any).data

  // ✅ Simpan permanen ke SocialAccount menggunakan userId dari temp
  await SocialAccount.updateOne(
    { userId: temp.userId, provider: "twitter" },
    {
      $set: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + Number(tokenData.expires_in) * 1000)
          : null,
        socialId: userData.id,
        username: userData.username,
        profileUrl: `https://twitter.com/${userData.username}`,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )

  // ✅ Hapus temporary record
  await SocialAccount.deleteOne({ _id: temp._id })

  // ✅ Redirect ke FE (TaskModal bisa pakai postMessage)
  const successUrl = new URL(
    `/twitter-success?status=connected&user=${userData.username}`,
    APP_URL
  )
  return NextResponse.redirect(successUrl)
}
