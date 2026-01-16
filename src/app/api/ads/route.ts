import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import dbConnect from '@/lib/mongodb'
import { Ad } from '@/models/Ad'
import { Notification } from '@/models/Notification' // Tambahkan import ini
import { auth } from '@/auth'

// 1. Definisikan Interface untuk Iklan
interface IAd {
  _id: string;
  expiresAt: Date;
  status: 'LIVE' | 'QUEUE' | 'EXPIRED' | 'REMOVED';
  scheduledAt: Date;
  imageUrl: string;
  targetUrl: string;
  createdBy: string;
  promoterAddress: string;
  paymentMethod: string;
  amount: string;
  depositTxHash: string;
  onchainHash: string;
  depositedAmountWei: string;
}

// ✅ FUNGSI GET: Sinkronisasi Status & Ambil Iklan Aktif
export async function GET() {
  try {
    await dbConnect()
    const now = new Date()

    // A. Bersihkan yang sudah expired
    await Ad.deleteMany({ expiresAt: { $lt: now } })

    // B. Cek transisi status dari QUEUE ke LIVE
    const currentLive = await Ad.findOne({ status: 'LIVE' })
    if (!currentLive) {
      await Ad.updateOne(
        { status: 'QUEUE', scheduledAt: { $lte: now } },
        { $set: { status: 'LIVE' } }
      )
    }

    // C. Ambil data dengan Type Casting yang ketat
    const activeAd = await Ad.findOne({ status: 'LIVE' })
      .sort({ scheduledAt: 1 })
      .lean<IAd | null>() 

    const queuedAd = await Ad.findOne({ status: 'QUEUE' })
      .lean<IAd | null>()

    return NextResponse.json({ 
      ad: activeAd,
      canBook: !queuedAd, 
      nextAvailableAt: activeAd ? activeAd.expiresAt : now
    })
  } catch (err: any) {
    return NextResponse.json({ ad: null, error: err.message }, { status: 500 })
  }
}

// ✅ FUNGSI POST: Logika Pembelian & Penempatan Slot
export async function POST(req: Request) {
  try {
    await dbConnect()
    const session = await auth()
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transactionId, userAddress, targetUrl, imageUrl, paymentMethod, amount } = await req.json()

    // 1. Validasi Slot Antrean
    const existingQueue = await Ad.findOne({ status: 'QUEUE' })
    if (existingQueue) {
      return NextResponse.json({ error: 'Slot is already fully booked!' }, { status: 400 })
    }

    // 2. Verifikasi MiniKit via Worldcoin API
    const wcRes = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${process.env.NEXT_PUBLIC_APP_ID}&type=transaction`,
      { headers: { Authorization: `Bearer ${process.env.WORLD_APP_API_KEY}` } }
    )
    const wcData = await wcRes.json()
    
    if (!wcData || wcData.error || !wcData.transactionHash) {
      return NextResponse.json({ error: 'Invalid MiniKit Transaction' }, { status: 400 })
    }

    // 3. Verifikasi On-Chain Receipt
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL)
    const receipt = await provider.getTransactionReceipt(wcData.transactionHash)
    
    if (!receipt || receipt.status !== 1) {
      return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 })
    }

    // 4. Logika Penentuan Waktu (LIVE vs QUEUE)
    const activeLive = await Ad.findOne({ status: 'LIVE' }).lean<IAd | null>()
    const now = new Date()
    
    let scheduledAt: Date
    let status: 'LIVE' | 'QUEUE'

    if (!activeLive) {
      scheduledAt = now
      status = 'LIVE'
    } else {
      scheduledAt = new Date(activeLive.expiresAt)
      status = 'QUEUE'
    }

    const expiresAt = new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000)

    // 5. Simpan ke Database
    const newAd = await Ad.create({
      createdBy: session.user.id,
      promoterAddress: userAddress.toLowerCase(),
      imageUrl,
      targetUrl,
      paymentMethod,
      amount,
      depositTxHash: transactionId,
      onchainHash: wcData.transactionHash,
      depositedAmountWei: parseAmountToWei(amount, paymentMethod),
      status,
      scheduledAt,
      expiresAt
    })

    // --- 🔔 TAMBAHAN LOGIKA NOTIFIKASI ---
    await Notification.create({
      userId: session.user.id,
      role: 'promoter',
      type: 'ad_booked',
      message: status === 'QUEUE' 
        ? `Payment confirmed! Your ad is scheduled and will go LIVE tomorrow.` 
        : `Payment confirmed! Your ad is now LIVE on the global feed.`,
      metadata: {
        adId: newAd._id,
        txHash: wcData.transactionHash,
        status: status
      }
    })
    // --- END NOTIFIKASI ---

    return NextResponse.json({ ok: true, ad: newAd })
  } catch (err: any) {
    console.error("API ADS ERROR:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function parseAmountToWei(amount: string, method: string) {
  const decimals = method === 'USDC' ? 6 : 18
  return ethers.parseUnits(amount, decimals).toString()
}