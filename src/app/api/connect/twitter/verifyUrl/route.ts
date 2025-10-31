import { NextResponse } from 'next/server'

const BOT_AUTH_TOKEN = process.env.TWITTER_BOT_AUTH_TOKEN!
const BOT_CSRF = process.env.TWITTER_BOT_CSRF!
const BOT_BEARER = process.env.BOT_BEARER!

function botHeaders() {
  return {
    Authorization: `Bearer ${BOT_BEARER}`,
    Cookie: `auth_token=${BOT_AUTH_TOKEN}; ct0=${BOT_CSRF}`,
    'x-csrf-token': BOT_CSRF,
    'User-Agent': 'Mozilla/5.0 (compatible; WorldAppBot/1.0; +https://worldapp.ai)',
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json()

    if (!/^https:\/\/(x|twitter)\.com\//.test(url)) {
      return NextResponse.json({ valid: false, reason: 'invalid_format' }, { status: 400 })
    }

    // 🔎 Gunakan GET karena Twitter sering block HEAD
    const res = await fetch(url, {
      method: 'GET',
      headers: botHeaders(),
      redirect: 'manual', // jangan auto-follow redirect
    })

    // ✅ 2xx → valid
    if (res.ok) {
      return NextResponse.json({ valid: true })
    }

    // ❌ Kalau 3xx, 4xx, 5xx → invalid
    return NextResponse.json(
      { valid: false, reason: `status_${res.status}` },
      { status: res.status }
    )
  } catch (err) {
    console.error('verifyUrl error:', err)
    return NextResponse.json({ valid: false, reason: 'fetch_failed' }, { status: 500 })
  }
}
