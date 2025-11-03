// /app/api/campaigns/route.ts
import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import dbConnect from '@/lib/mongodb'
import { Campaign } from '@/models/Campaign'
import { Notification } from '@/models/Notification'
import { auth } from '@/auth'
import User, { IUser } from "@/models/User"
import mongoose from "mongoose"

// ✅ Utility: konversi string ke BigInt dengan 18 desimal (WR)
function parseToBigInt(amount: string | number): bigint {
  const [intPart, fracPart = ''] = amount.toString().split('.')
  const frac = (fracPart + '0'.repeat(18)).slice(0, 18)
  return BigInt(intPart + frac)
}

// ================================
// GET semua campaign
// ================================
export async function GET() {
  await dbConnect()
  const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean()

// 🔹 Kumpulkan semua participant ID unik
const allParticipantIds = [
  ...new Set(
    campaigns.flatMap((c) => (c.participants as string[] | undefined) || [])
  ),
];

// 🔹 Konversi ke ObjectId untuk query user
const objectIds: mongoose.Types.ObjectId[] = allParticipantIds
  .filter((id): id is string => mongoose.Types.ObjectId.isValid(id))
  .map((id) => new mongoose.Types.ObjectId(id));

// 🔹 Ambil user berdasarkan ObjectId
const users: IUser[] = await User.find({ _id: { $in: objectIds } })
  .select("_id username profilePictureUrl")
  .lean<IUser[]>();

// 🔹 Buat peta: stringId (hex) → user data (bukan cuma username)
const userMap: Record<string, { username?: string; profilePictureUrl?: string }> = {};
users.forEach((u) => {
  userMap[String(u._id)] = {
    username: u.username || "Anonymous",
    profilePictureUrl: u.profilePictureUrl || "",
  };
});

// 🔹 Enrich campaign data dengan username
const enriched = campaigns.map((c) => ({
  ...c,
  createdBy: userMap[c.createdBy]?.username || "(unknown)",
  participants: (c.participants || []).map(
    (id: string) => userMap[id]?.username || "(unknown)"
  ),
}));

  return NextResponse.json(enriched)
}

// ================================
// POST - Buat campaign baru (setelah verifikasi deposit WR on-chain)
// ================================
export async function POST(req: Request) {
  try {
    await dbConnect()

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      description,
      budget,
      reward,
      tasks,
      depositTxHash,   // dari MiniKit (transaction_id)
      userAddress,      // wallet promoter
    } = body

    // Validasi dasar
    if (!title || !description || !tasks?.length) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
    }
    if (!depositTxHash || !userAddress) {
      return NextResponse.json({ error: 'Missing deposit information' }, { status: 400 })
    }

    // ======================================
    // 1️⃣ Ambil hash on-chain dari Worldcoin API
    // ======================================
    const WORLD_APP_ID = process.env.NEXT_PUBLIC_APP_ID
    const WORLD_API_KEY = process.env.WORLD_APP_API_KEY

    const wcRes = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${depositTxHash}?app_id=${WORLD_APP_ID}&type=transaction`,
      { headers: { Authorization: `Bearer ${WORLD_API_KEY}` } }
    )

    if (!wcRes.ok) {
      const errMsg = await wcRes.text()
      return NextResponse.json({ error: 'Worldcoin API error: ' + errMsg }, { status: 502 })
    }

    const wcData = await wcRes.json()
    const onchainHash = wcData.transactionHash
    if (!onchainHash) {
      return NextResponse.json({ error: 'No on-chain hash found from Worldcoin API' }, { status: 404 })
    }

    // ======================================
    // 2️⃣ Validasi transaksi di blockchain
    // ======================================
    const RPC = process.env.NEXT_PUBLIC_RPC_URL
    const WR_CONTRACT = process.env.NEXT_PUBLIC_WR_CONTRACT
    const ESCROW_CONTRACT = process.env.NEXT_PUBLIC_WR_ESCROW
    if (!RPC || !WR_CONTRACT) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const provider = new ethers.JsonRpcProvider(RPC)
    const receipt = await provider.getTransactionReceipt(onchainHash)

    if (!receipt) {
      return NextResponse.json({ error: 'Transaction not found on chain' }, { status: 404 })
    }
    if (receipt.status !== 1) {
      return NextResponse.json({ error: 'Transaction failed on chain' }, { status: 400 })
    }

    // ======================================
    // 3️⃣ Validasi log transfer WR ke kontrak WR
    // ======================================
    const wrContractLower = WR_CONTRACT!.toLowerCase()
    const escrowAddrLower = ESCROW_CONTRACT!.toLowerCase()
    const userLower = userAddress.toLowerCase();

    const erc20Interface = new ethers.Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ])

    let foundValidTransfer = false
    let transferredAmount: bigint | null = null

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === wrContractLower) {
        try {
          const parsed = erc20Interface.parseLog(log)
          if (!parsed) continue
          const args = parsed.args as Record<string, any>
          const fromAddr = (args.from as string).toLowerCase()
          const toAddr = (args.to as string).toLowerCase()
          const value = BigInt(args.value)

          // promoter kirim WR ke kontrak WR
      if (fromAddr === userLower && toAddr === escrowAddrLower) {
        foundValidTransfer = true;
        transferredAmount = value;
        break;
      }
        } catch {
          // bukan event Transfer
        }
      }
    }

    if (!foundValidTransfer || transferredAmount === null) {
      return NextResponse.json({ error: 'No valid WR transfer found in transaction logs' }, { status: 400 })
    }

    // ======================================
    // 4️⃣ Simpan campaign baru
    // ======================================
    const newCampaign = await Campaign.create({
      title,
      description,
      budget,
      reward,
      tasks,
      status: 'active',
      createdBy: session.user.id,
      promoterAddress: userAddress.toLowerCase(),
      depositTxHash,
      onchainHash: onchainHash.toLowerCase(),
      depositedWR: transferredAmount.toString(),
      remainingWR: transferredAmount.toString(),
      contributors: 0,
      participants: [],
    })

    // ======================================
    // 5️⃣ Kirim notifikasi promoter (dengan metadata link explorer)
    // ======================================
    const explorerBase = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://worldscan.org/tx/'
    const txLink = `${explorerBase}${onchainHash}`

    await Notification.create({
      userId: session.user.id,
      role: 'promoter',
      type: 'campaign_created',
      message: `Your campaign "${newCampaign.title}" has been successfully created and verified on-chain. 🧾`,
      metadata: {
        onchainHash: onchainHash.toLowerCase(),
        txLink,
      },
    })
    
    return NextResponse.json({
      ok: true,
      message: 'Campaign created and verified successfully',
      campaign: newCampaign,
    })
  } catch (err: any) {
    console.error('❌ Error /api/campaign:', err)
    return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 })
  }
}
