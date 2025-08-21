import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Role from '@/models/Role'
import { auth } from '@/auth'   // pakai auth() langsung

export async function POST(req: Request) {
  await dbConnect()

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { role } = body
  if (!role) return NextResponse.json({ success: false, message: 'Missing role' }, { status: 400 })

  try {
    let userRole = await Role.findOne({ userId: session.user.id })

    if (!userRole) {
      // buat baru kalau belum ada
      userRole = await Role.create({
        userId: session.user.id,
        roles: [role],
        activeRole: role,
      })
    } else {
      // update roles & activeRole
      if (!userRole.roles.includes(role)) userRole.roles.push(role)
      userRole.activeRole = role
      await userRole.save()
    }

    return NextResponse.json({ success: true, activeRole: userRole.activeRole })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
