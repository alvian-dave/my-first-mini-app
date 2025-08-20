import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { Campaign } from '@/models/Campaign'
import { getServerSession } from 'next-auth'

export async function GET() {
  await dbConnect()
  const campaigns = await Campaign.find().lean()
  return NextResponse.json(campaigns)
}

export async function POST(req: Request) {
  await dbConnect()
  const session = await getServerSession()
  const body = await req.json()

  const newCampaign = await Campaign.create({
    ...body,
    status: 'active',
    createdBy: session?.user?.id || 'anonymous',
  })

  return NextResponse.json(newCampaign)
}
