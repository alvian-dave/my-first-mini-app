import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Referral from '@/models/Referral'
import ReferralCode from '@/models/ReferralCode'
import User from '@/models/User' // Tambahkan import User
import { auth } from '@/auth'
import { ReferralStatus } from '@/types'

/**
 * Generate unique referral code with prefix WR-
 */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'WR-'
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * Ensures user has a referral code (Generate once in a lifetime)
 */
async function getOrCreateReferralCode(userId: string) {
  const existing = await ReferralCode.findOne({ userId })
  if (existing) return existing.code

  let code = ''
  let exists = true

  // Loop to ensure uniqueness in DB
  while (exists) {
    code = generateCode()
    exists = !!(await ReferralCode.findOne({ code }))
  }

  const created = await ReferralCode.create({ userId, code })
  return created.code
}

export async function GET() {
  try {
    await dbConnect()

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 1. Ambil data User untuk cek umur akun (Batas 24 Jam)
    // .select('createdAt') sangat penting agar logic frontend akurat
    const user = await User.findById(userId).select('createdAt')
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 })
    }

    // 2. AUTO GENERATE KODE (Jika pertama kali buka modal)
    const referralCode = await getOrCreateReferralCode(userId)

    // 3. STATISTIK REAL-TIME
    // Mengambil data dari koleksi Referral untuk melihat performa user sebagai Referrer
    const statsAgg = await Referral.aggregate([
      { $match: { referrerUserId: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ])

    // Inisialisasi object stats sesuai type ReferralStatus
    const stats: Record<Exclude<ReferralStatus, 'failed'>, number> = { 
      pending: 0, 
      confirmed: 0, 
      expired: 0 
    }

    statsAgg.forEach((row) => {
      if (row._id in stats) {
        stats[row._id as keyof typeof stats] = row.count
      }
    })

    // 4. CEK APAKAH USER SUDAH PERNAH SUBMIT KODE ORANG LAIN
    const alreadyUsed = !!(await Referral.findOne({
      refereeUserId: userId,
    }))

    // 5. RESPONSE FINAL
    return NextResponse.json({
      ok: true,
      referralCode,
      hasSubmittedReferral: alreadyUsed,
      userCreatedAt: user.createdAt, // Dikirim untuk logic locking di frontend
      stats,
    })

  } catch (error: any) {
    console.error('REFERRAL_ME_ERROR:', error)
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 })
  }
}