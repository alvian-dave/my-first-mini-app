import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import ReferralCode from '@/models/ReferralCode'
import User from '@/models/User'
import { auth } from '@/auth'

/**
 * Generate unique referral code with prefix WR-
 * Menghindari karakter ambigu seperti 0, O, 1, I, L
 */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'WR-'
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST() {
  try {
    await dbConnect()

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 1. Cek apakah user valid
    const userExists = await User.exists({ _id: userId })
    if (!userExists) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 })
    }

    // 2. Cek apakah sudah punya kode (Jangan generate baru jika sudah ada)
    const existing = await ReferralCode.findOne({ userId })
    if (existing) {
      return NextResponse.json({ 
        ok: true, 
        code: existing.code,
        message: 'Code already exists' 
      })
    }

    // 3. Generate Unique Code
    let code = ''
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    while (!isUnique && attempts < maxAttempts) {
      code = generateCode()
      const duplicate = await ReferralCode.findOne({ code })
      if (!duplicate) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      throw new Error('Failed to generate a unique code after multiple attempts')
    }

    // 4. Create ke Database
    const created = await ReferralCode.create({
      userId,
      code,
      isActive: true
    })

    return NextResponse.json({
      ok: true,
      code: created.code,
      message: 'Code generated successfully'
    })

  } catch (error: any) {
    console.error('REFERRAL_CODE_POST_ERROR:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}