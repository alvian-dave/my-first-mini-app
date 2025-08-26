import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { Campaign } from '@/models/Campaign'
import Balance from '@/models/Balance'
import { auth } from '@/auth'

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
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { budget, reward, title, description, links } = body

  if (!budget || !reward) {
    return NextResponse.json({ error: 'Budget & reward required' }, { status: 400 })
  }

  // cek balance promoter
  const promoterBalance = await Balance.findOne({ userId: session.user.id })
  if (!promoterBalance || promoterBalance.amount < Number(budget)) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // potong balance promoter
  promoterBalance.amount -= Number(budget)
  await promoterBalance.save()

  // buat campaign
  const newCampaign = await Campaign.create({
    title,
    description,
    links,
    budget,
    reward,
    status: 'active',
    createdBy: session.user.id,
  })

  return NextResponse.json(newCampaign)
}
