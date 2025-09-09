import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { Campaign } from '@/models/Campaign'
import Balance from '@/models/Balance'
import { auth } from '@/auth'   // ✅ gantiin getServerSession

// GET all campaigns
export async function GET() {
  await dbConnect()
  const campaigns = await Campaign.find().lean()
  return NextResponse.json(campaigns)
}

// CREATE new campaign
export async function POST(req: Request) {
  await dbConnect()

  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const budgetNum = parseFloat(body.budget) || 0

  // Ambil balance promoter
  const balanceDoc = await Balance.findOne({ userId: session.user.id })
  if (!balanceDoc || balanceDoc.amount < budgetNum) {
    return NextResponse.json(
      { error: 'Failed to create campaign: insufficient balance' },
      { status: 400 }
    )
  }

  // Kurangi balance
  balanceDoc.amount -= budgetNum
  await balanceDoc.save()

  // Buat campaign
  const newCampaign = await Campaign.create({
    ...body,
    status: 'active',
    createdBy: session.user.id,
  })

  return NextResponse.json(newCampaign)
}