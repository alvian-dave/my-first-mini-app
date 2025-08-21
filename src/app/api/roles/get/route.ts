import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Role from '@/models/Role'
import { auth } from '@/auth'

export async function GET() {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ success: false }, { status: 401 })

  const userRole = await Role.findOne({ userId: session.user.id })
  if (!userRole) return NextResponse.json({ success: false, message: 'Role not found' })

  return NextResponse.json({ success: true, activeRole: userRole.activeRole })
}
