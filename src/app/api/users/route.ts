// /app/api/users/route.ts
import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import mongoose from 'mongoose'

export async function GET(req: Request) {
  await dbConnect()
  const url = new URL(req.url)
  const idsParam = url.searchParams.get('ids') // comma separated
  if (!idsParam) return NextResponse.json([], { status: 200 })

  const ids = idsParam.split(',').filter(id => mongoose.Types.ObjectId.isValid(id))
  const objectIds = ids.map(id => new mongoose.Types.ObjectId(id))
  const users = await User.find({ _id: { $in: objectIds } })
    .select('username _id')
    .lean()

  return NextResponse.json(users)
}
