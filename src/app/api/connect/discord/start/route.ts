import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import SocialAccount from "@/models/SocialAccount"
import { auth } from "@/auth"
import crypto from "crypto"

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI! // e.g. https://yourapp.com/api/connect/discord/callback
const DISCORD_SCOPE = process.env.DISCORD_SCOPE || "identify guilds.join" // default scope

export async function GET() {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Generate state (CSRF protection)
  const state = crypto.randomBytes(16).toString("hex")

  // PKCE: code_verifier + code_challenge
  const codeVerifier = crypto.randomBytes(32).toString("hex")
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url")

  // Save temporary record to SocialAccount (provider: discord_temp)
  await SocialAccount.updateOne(
    { userId: session.user.id, provider: "discord_temp" },
    {
      $set: {
        state,
        codeVerifier,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  )

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: "code",
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    scope: DISCORD_SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent",
  })

  const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`

  // Return URL to frontend (frontend will open popup or redirect)
  return NextResponse.json({ url: authUrl })
}
