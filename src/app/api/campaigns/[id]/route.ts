import { NextResponse } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import { Campaign } from '@/models/Campaign'
import { Types } from 'mongoose'

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect()
  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const body = await req.json()
  const updated = await Campaign.findByIdAndUpdate(
    params.id,
    { $set: body },
    { new: true }
  )

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect()
  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const campaign = await Campaign.findById(params.id)
  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (campaign.contributors > 0) {
    return NextResponse.json(
      { error: 'Cannot delete campaign with submissions' },
      { status: 400 }
    )
  }

  await Campaign.findByIdAndDelete(params.id)
  return NextResponse.json({ success: true })
}
