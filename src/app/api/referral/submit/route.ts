import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Referral from '@/models/Referral'
import ReferralCode from '@/models/ReferralCode'
import User from '@/models/User'
import { Notification } from '@/models/Notification'
import { auth } from '@/auth'
import { ethers } from 'ethers'
import WRABI from '@/abi/WRCredit.json'

const REFERRAL_REWARD = 5
const REFERRAL_TTL_MS = 24 * 60 * 60 * 1000

export async function POST(req: Request) {
  try {
    await dbConnect()

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await req.json()
    if (!code) {
      return NextResponse.json({ ok: false, error: 'Referral code required' }, { status: 400 })
    }

    const refereeUserId = session.user.id

    // 1. Cek apakah user ini (Referee) sudah pernah menggunakan kode referral manapun
    const used = await Referral.findOne({ refereeUserId })
    if (used) {
      return NextResponse.json(
        { ok: false, error: 'You have already used a referral code' },
        { status: 400 }
      )
    }

    // 2. Cari kode referral yang dimasukkan
    const referralCodeDoc = await ReferralCode.findOne({ code: code.toUpperCase().trim() })
    if (!referralCodeDoc) {
      return NextResponse.json({ ok: false, error: 'Invalid referral code' }, { status: 404 })
    }

    // 3. Validasi: Tidak boleh merefer diri sendiri
    if (referralCodeDoc.userId === refereeUserId) {
      return NextResponse.json({ ok: false, error: 'You cannot refer yourself' }, { status: 400 })
    }

    const referrerUserId = referralCodeDoc.userId

    // 4. Ambil data lengkap User (Referrer & Referee)
    const [refereeUser, referrerUser] = await Promise.all([
      User.findById(refereeUserId),
      User.findById(referrerUserId)
    ])

    if (!refereeUser || !referrerUser) {
      return NextResponse.json({ ok: false, error: 'User data not found' }, { status: 404 })
    }

    // 5. ⏳ TTL CHECK (Aturan Baku 24 Jam)
    const now = Date.now()
    const createdAt = refereeUser.createdAt ? new Date(refereeUser.createdAt).getTime() : null
    
    if (!createdAt || (now - createdAt > REFERRAL_TTL_MS)) {
      return NextResponse.json(
        { ok: false, error: 'Referral period has expired (Max 24h from registration)' },
        { status: 400 }
      )
    }

    // 6. Validasi Alamat Wallet (Penting untuk transfer on-chain)
    if (!refereeUser.walletAddress || !referrerUser.walletAddress) {
      return NextResponse.json({ ok: false, error: 'Wallet address not linked' }, { status: 400 })
    }

    // 7. 🔒 CREATE REFERRAL RECORD (Status: Pending)
    // Gunakan try-catch khusus untuk mencegah duplikasi saat konkurensi
    let referral;
    try {
      referral = await Referral.create({
        referrerUserId,
        referrerWallet: referrerUser.walletAddress,
        refereeUserId,
        refereeWallet: refereeUser.walletAddress,
        referralCode: referralCodeDoc.code,
        status: 'pending',
        rewardAmount: REFERRAL_REWARD,
      })
    } catch (dbErr) {
      return NextResponse.json({ ok: false, error: 'Process already in progress' }, { status: 400 })
    }

    // 8. ===== ⛓️ ON-CHAIN TRANSFER =====
    try {
      const RPC = process.env.NEXT_PUBLIC_RPC_URL!
      const WR_CONTRACT = process.env.NEXT_PUBLIC_WR_CONTRACT!
      const PRIVATE_KEY = process.env.PRIVATE_KEY!

      const provider = new ethers.JsonRpcProvider(RPC)
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
      const wr = new ethers.Contract(WR_CONTRACT, WRABI as any, wallet)

      const amount = ethers.parseUnits(String(REFERRAL_REWARD), 18)

      // Jalankan transfer (Paralel untuk efisiensi jika nonce memungkinkan, 
      // namun seri lebih aman untuk manajemen nonce sederhana)
      const tx1 = await wr.transfer(referrerUser.walletAddress, amount)
      const tx2 = await wr.transfer(refereeUser.walletAddress, amount)

      // Tunggu konfirmasi (1 block)
      await Promise.all([tx1.wait(1), tx2.wait(1)])

      // 9. ✅ FINALIZE REFERRAL STATUS
      referral.status = 'confirmed'
      referral.confirmedAt = new Date()
      referral.txHashReferrer = tx1.hash
      referral.txHashReferee = tx2.hash
      await referral.save()

      // 10. ===== 🔔 NOTIFICATIONS =====
      const explorer = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://worldscan.org/tx/'

      const notifications = [
        {
          userId: referrerUserId,
          role: 'hunter',
          type: 'referral_reward',
          message: `You received ${REFERRAL_REWARD} WR from a successful referral.`,
          metadata: { refereeUserId, amount: REFERRAL_REWARD, txHash: tx1.hash, txLink: explorer + tx1.hash }
        },
        {
          userId: refereeUserId,
          role: 'hunter',
          type: 'referral_reward',
          message: `You received ${REFERRAL_REWARD} WR for joining via a referral.`,
          metadata: { referrerUserId, amount: REFERRAL_REWARD, txHash: tx2.hash, txLink: explorer + tx2.hash }
        }
      ]

      await Notification.insertMany(notifications)

      return NextResponse.json({
        ok: true,
        message: 'Referral confirmed and rewards sent successfully',
      })

    } catch (txErr: any) {
      console.error('Blockchain Transfer Error:', txErr)
      
      // Jika gagal di on-chain, update status menjadi failed
      referral.status = 'failed'
      await referral.save()

      return NextResponse.json(
        { ok: false, error: 'Reward transfer failed on blockchain' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('API_SUBMIT_ERROR:', error)
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 })
  }
}