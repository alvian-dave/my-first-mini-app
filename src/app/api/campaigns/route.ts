import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { Campaign } from '@/models/Campaign'
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

  const session = await auth()   // ✅ ambil session pakai auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const newCampaign = await Campaign.create({
    ...body,
    status: 'active',
    createdBy: session.user?.id || 'anonymous',  // ✅ akses session.user
  })

  return NextResponse.json(newCampaign)
}