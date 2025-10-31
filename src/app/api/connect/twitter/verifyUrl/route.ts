import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()

    if (!/^https:\/\/(x|twitter)\.com\//.test(url)) {
      return NextResponse.json({ valid: false, reason: 'invalid_format' }, { status: 400 })
    }

    // Gunakan HEAD untuk cek status
    const res = await fetch(url, { method: 'HEAD' })

    if (!res.ok) {
      return NextResponse.json({ valid: false, reason: 'not_found' }, { status: 404 })
    }

    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error('verifyUrl error:', err)
    return NextResponse.json({ valid: false, reason: 'fetch_failed' }, { status: 500 })
  }
}
