import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Balance from "@/models/Balance"
import Role from "@/models/Role"
import { auth } from "@/auth"

// ✅ GET /api/balance/[id]
export async function GET(
  _req: Request
) {
  // ambil session user
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  await dbConnect()

  try {
    // ambil balance dari collection Balance
    const balance = await Balance.findOne({ userId }).lean() as {
      userId: string
      amount: number
    } | null

    // ambil role dari collection Role
    const roleDoc = await Role.findOne({ userId }).lean() as {
      activeRole: string
    } | null

    return NextResponse.json({
      success: true,
      balance: {
        userId,
        amount: balance?.amount ?? 0, // default 0 kalau belum ada
        role: roleDoc?.activeRole,     // ambil dari Role collection
      },
    })
  } catch (err) {
    console.error("❌ GET /api/balance/[id] error:", err)
    return NextResponse.json(
      { success: false, error: "Failed to fetch balance" },
      { status: 500 }
    )
  }
}

// ✅ POST /api/balance/[id] → update atau tambah balance
export async function POST(
  req: Request
) {
  // ambil session user
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  await dbConnect()

  try {
    const { amount } = await req.json()

    if (typeof amount !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      )
    }

    // update atau buat balance
    const updated = await Balance.findOneAndUpdate(
      { userId },
      { $inc: { amount } }, // tambah amount
      { new: true, upsert: true }
    )

    // ambil role terbaru
    const roleDoc = await Role.findOne({ userId }).lean() as {
      activeRole: string
    } | null

    return NextResponse.json({
      success: true,
      balance: {
        userId,
        amount: updated?.amount ?? 0,
        role: roleDoc?.activeRole,
      },
    })
  } catch (err) {
    console.error("❌ POST /api/balance/[id] error:", err)
    return NextResponse.json(
      { success: false, error: "Failed to update balance" },
      { status: 500 }
    )
  }
}
