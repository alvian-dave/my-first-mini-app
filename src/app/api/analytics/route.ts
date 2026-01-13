import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { Campaign } from '@/models/Campaign'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

// 🛡️ Interface ketat agar tidak error saat build
interface ITransaction {
  type: 'reward' | 'rescue';
  amount: string;
  timestamp: Date;
}

interface ICampaign {
  participants: string[];
  status: 'active' | 'finished' | 'rejected';
  depositedWR: string;
  remainingWR: string;
  reward: string;
  transactions: ITransaction[];
  createdAt: Date;
}

export async function GET() {
  try {
    await dbConnect()
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const promoterId = session.user.id.toString()

    // Ambil data dengan tipe ICampaign[]
    const allCampaigns = (await Campaign.find({ createdBy: promoterId }).lean()) as unknown as ICampaign[]
    
    if (!allCampaigns || allCampaigns.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        stats: { totalParticipants: "0", totalWRSpent: "0", escrowHolding: "0", conversionRate: "0", globalReach: 0 }, 
        graphData: [], 
        growth: "0", 
        efficiency: { usagePercent: "0" } 
      })
    }

    let totalParticipants = 0
    let totalSpentWei = BigInt(0)
    let totalEscrowWei = BigInt(0)
    let totalTargetSlots = 0
    const allRewards: { amount: string; timestamp: Date }[] = []

    allCampaigns.forEach((c: ICampaign) => {
      // 1. Total Participants
      totalParticipants += (c.participants?.length || 0)
      
      // 2. Escrow Holding (Hanya yang statusnya active)
      if (c.status === 'active') {
        totalEscrowWei += BigInt(c.remainingWR || "0")
      }

      // 3. Target Slots Calculation
      const depWei = BigInt(c.depositedWR || "0")
      const depUnit = Number(depWei) / 1e18
      const rewUnit = Number(c.reward || 0)
      if (rewUnit > 0) {
        totalTargetSlots += (depUnit / rewUnit)
      }

      // 4. Extract Reward Transactions
      if (c.transactions && Array.isArray(c.transactions)) {
        c.transactions.forEach((t: ITransaction) => {
          if (t.type === 'reward') {
            totalSpentWei += BigInt(t.amount || "0")
            allRewards.push({ amount: t.amount, timestamp: t.timestamp })
          }
        })
      }
    })

    const weiToWR = (wei: bigint) => (Number(wei) / 1e18).toFixed(2)
    const currentTotalSpent = weiToWR(totalSpentWei)

    // 5. Growth Trajectory Logic (Cumulative)
    allRewards.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    let growthPercent = "0"
    if (allRewards.length > 1) {
      const lastTxAmount = BigInt(allRewards[allRewards.length - 1].amount)
      const previousTotalWei = totalSpentWei - lastTxAmount
      if (previousTotalWei > BigInt(0)) {
        growthPercent = ((Number(lastTxAmount) / Number(previousTotalWei)) * 100).toFixed(1)
      }
    }

    // 6. Generate 7 Data Points for Graph (Cumulative Growth)
    let runningTotal = 0
    const graphData = allRewards.slice(-7).map((r, i) => {
      runningTotal += (Number(BigInt(r.amount)) / 1e18)
      return {
        label: `T${i + 1}`,
        value: runningTotal.toFixed(2)
      }
    })

    return NextResponse.json({
      ok: true,
      stats: {
        totalParticipants: totalParticipants.toLocaleString(),
        totalWRSpent: currentTotalSpent,
        escrowHolding: weiToWR(totalEscrowWei),
        conversionRate: totalTargetSlots > 0 ? ((totalParticipants / totalTargetSlots) * 100).toFixed(1) : "0",
        globalReach: allCampaigns.length
      },
      growth: growthPercent,
      graphData: graphData.length > 0 ? graphData : [
        { label: 'S', value: "0" }, { label: 'M', value: "0" }, { label: 'T', value: "0" },
        { label: 'W', value: "0" }, { label: 'T', value: "0" }, { label: 'F', value: "0" }, { label: 'S', value: "0" }
      ],
      efficiency: {
        usagePercent: totalSpentWei > BigInt(0) ? "100" : "0"
      }
    })

  } catch (err: any) {
    console.error("Promoter Analytics Error:", err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}