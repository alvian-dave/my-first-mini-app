import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import SocialAccount from "@/models/SocialAccount"
import { exchangeDiscordCodeForToken, getDiscordUserProfile } from "@/lib/discord"

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET! // optional for public clients but include if available
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!
const APP_URL = process.env.AUTH_URL || "http://localhost:3000"

interface DiscordTokenResponse {
  access_token: string
  token_type?: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

export async function GET(req: Request) {
  await dbConnect()

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 })
  }

  // Find temp record saved in /start
  const temp = await SocialAccount.findOne({ provider: "discord_temp", state })
  if (!temp || !temp.userId || !temp.codeVerifier) {
    return NextResponse.json({ error: "Invalid or expired state" }, { status: 400 })
  }

  // Exchange code -> token using helper (PKCE aware)
  const tokenJson = await exchangeDiscordCodeForToken(
    code,
    DISCORD_REDIRECT_URI,
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    temp.codeVerifier
  ) as DiscordTokenResponse | null

  if (!tokenJson || !tokenJson.access_token) {
    return NextResponse.json({ error: "Failed to get access token", details: tokenJson }, { status: 400 })
  }

  // Fetch Discord user profile using access_token
  const profile = await getDiscordUserProfile(tokenJson.access_token)
  if (!profile || !profile.id || !profile.username) {
    return NextResponse.json({ error: "Failed to fetch Discord profile", details: profile }, { status: 400 })
  }

  // Save permanent SocialAccount (provider: discord)
  await SocialAccount.updateOne(
    { userId: temp.userId, provider: "discord" },
    {
      $set: {
        accessToken: tokenJson.access_token,
        refreshToken: tokenJson.refresh_token,
        expiresAt: tokenJson.expires_in ? new Date(Date.now() + tokenJson.expires_in * 1000) : null,
        socialId: profile.id,
        username: `${profile.username}${profile.discriminator ? `#${profile.discriminator}` : ""}`,
        profileUrl: `https://discord.com/users/${profile.id}`,
        avatar: profile.avatar ?? null,
        scope: tokenJson.scope ? tokenJson.scope.split(" ") : [],
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )

  // Delete temp record
  try {
    await SocialAccount.deleteOne({ _id: temp._id })
  } catch (e) {
    // non-fatal, log and continue
    console.warn("Failed to delete discord_temp record:", e)
  }

  // Redirect back to frontend success page (which will notify opener via postMessage)
  const successUrl = new URL(
    `/discord-success?status=connected&user=${encodeURIComponent(`${profile.username}${profile.discriminator ? `#${profile.discriminator}` : ""}`)}`,
    APP_URL
  )
  return NextResponse.redirect(successUrl)
}
