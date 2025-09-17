import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { Campaign } from '@/models/Campaign'
import { Notification } from '@/models/Notification'
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

  const newCampaign = await Campaign.create({
    ...body,
    status: 'active',
    createdBy: session.user.id,
  })

  // ✅ Notifikasi cuma dibuat sekali, di sini
  await Notification.create({
    userId: session.user.id,
    role: 'promoter',
    type: 'campaign_created',
    message: `Your campaign "${newCampaign.title}" has been successfully created.`,
  })

  return NextResponse.json(newCampaign)
}
