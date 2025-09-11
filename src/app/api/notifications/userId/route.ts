import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Notification } from "@/models/Notification"
import { auth } from "@/auth" // session auth jika perlu

type ParamsPromise = Promise<{ userId: string }>

export async function GET(
  _req: NextRequest,
  { params }: { params: ParamsPromise }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params
  const role = _req.nextUrl.searchParams.get("role") || undefined

  await dbConnect()

  try {
    const filter: any = { userId }
    if (role) filter.role = role

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)

    return NextResponse.json({ success: true, notifications })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: ParamsPromise }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params
  const body = await req.json()
  const { type, message, role } = body

  if (!type || !message || !role) {
    return NextResponse.json(
      { error: "Missing type, message, or role" },
      { status: 400 }
    )
  }

  await dbConnect()

  try {
    const notif = await Notification.create({ userId, role, type, message })
    return NextResponse.json({ success: true, notification: notif }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: ParamsPromise }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params
  const body = await req.json()
  const { id } = body

  if (!id) {
    return NextResponse.json({ error: "Missing notification ID" }, { status: 400 })
  }

  await dbConnect()

  try {
    const updated = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    )
    return NextResponse.json({ success: true, notification: updated })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    )
  }
}
