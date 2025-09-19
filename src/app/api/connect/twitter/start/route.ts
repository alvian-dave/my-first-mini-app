import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import SocialAccount from '@/models/SocialAccount'
import { auth } from '@/auth'
import crypto from 'crypto'

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI
const TWITTER_SCOPE = 'tweet.read tweet.write users.read offline.access'

export async function GET() {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ✅ Generate random state untuk CSRF protection
  const state = crypto.randomBytes(16).toString('hex')

  // ✅ Generate PKCE code_verifier dan code_challenge
  const codeVerifier = crypto.randomBytes(32).toString('hex')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  // ✅ Simpan state + codeVerifier sementara di DB
  await SocialAccount.updateOne(
    { userId: session.user.id, provider: 'twitter_temp' },
    { $set: { state, codeVerifier, createdAt: new Date() } },
    { upsert: true }
  )

  // ✅ Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TWITTER_CLIENT_ID!,
    redirect_uri: TWITTER_REDIRECT_URI!, // misalnya http://localhost:3000/api/connect/twitter/callback
    scope: TWITTER_SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  const url = `https://twitter.com/i/oauth2/authorize?${params.toString()}`

  // ✅ Frontend (TaskModal) butuh URL ini untuk buka popup
  return NextResponse.json({ url })
}
