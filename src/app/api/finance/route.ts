import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { Campaign } from '@/models/Campaign'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

interface ITransaction {
  type: 'reward' | 'rescue';
  amount: string;
  timestamp: Date;
}

interface ICampaign {
  _id: any;
  name: string;
  status: 'active' | 'finished' | 'rejected';
  depositedWR: string;
  remainingWR: string;
  reward: string;
  budget: string; // Unit WR
  participants: string[];
  transactions: ITransaction[];
}

export async function GET() {
  try {
    await dbConnect()
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const promoterId = session.user.id.toString()

    // Ambil campaign yang Active ATAU punya histori Rescue
    const campaigns = (await Campaign.find({
      createdBy: promoterId,
      $or: [
        { status: 'active' },
        { 'transactions.type': 'rescue' }
      ]
    }).lean()) as unknown as ICampaign[]

    let totalActiveParticipants = 0
    let totalActiveUsedWei = BigInt(0)
    let totalRefundsWei = BigInt(0)

    const ledger = campaigns.map((c) => {
      const isActive = c.status === 'active'
      
      // Hitung Rewards (Used)
      let rewardSumWei = BigInt(0)
      let rescueSumWei = BigInt(0)

      if (c.transactions && Array.isArray(c.transactions)) {
        c.transactions.forEach((tx) => {
          if (tx.type === 'reward') {
            rewardSumWei += BigInt(tx.amount || "0")
          } else if (tx.type === 'rescue') {
            rescueSumWei += BigInt(tx.amount || "0")
            totalRefundsWei += BigInt(tx.amount || "0")
          }
        })
      }

      // Update Global Stats hanya jika Active
      if (isActive) {
        totalActiveParticipants += (c.participants?.length || 0)
        totalActiveUsedWei += rewardSumWei
      }

      const weiToWR = (wei: bigint) => (Number(wei) / 1e18).toLocaleString()

      return {
        id: `CP-${c._id.toString().slice(-3).toUpperCase()}`,
        name: c.name,
        status: isActive ? 'Active' : 'Finished',
        used: (Number(rewardSumWei) / 1e18).toLocaleString(),
        budget: c.budget,
        participants: (c.participants?.length || 0).toLocaleString(),
        remaining: isActive ? (Number(BigInt(c.remainingWR || "0")) / 1e18).toLocaleString() : "0",
        refund: !isActive ? (Number(rescueSumWei) / 1e18).toLocaleString() : undefined
      }
    })

    return NextResponse.json({
      ok: true,
      availableBalance: "0", // Abaikan dulu sesuai request
      quickStats: {
        totalActiveParticipants: totalActiveParticipants.toLocaleString(),
        totalActiveUsed: (Number(totalActiveUsedWei) / 1e18).toLocaleString(),
        totalRefunds: (Number(totalRefundsWei) / 1e18).toLocaleString()
      },
      ledger: ledger.reverse() // Terbaru di atas
    })

  } catch (err: any) {
    console.error("Finance API Error:", err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}