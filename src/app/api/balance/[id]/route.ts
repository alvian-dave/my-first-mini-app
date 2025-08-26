import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Balance from "@/models/Balance"
import Role from "@/models/Role"
import { auth } from "@/auth"

type ParamsPromise = Promise<{ id: string }>

// ✅ GET /api/balance/[id]
export async function GET(
  _req: Request,
  { params }: { params: ParamsPromise }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  if (session.user.id !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await dbConnect()

  try {
    const balance = await Balance.findOne({ userId: id }).lean()
    const roleDoc = await Role.findOne({ userId: id }).lean()

    return NextResponse.json({
      success: true,
      balance: {
        userId: id,
        amount: balance?.amount || 0,
        role: roleDoc?.activeRole,
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

// ✅ POST /api/balance/[id]
export async function POST(
  req: Request,
  { params }: { params: ParamsPromise }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  if (session.user.id !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await dbConnect()

  try {
    const { amount } = await req.json()
    if (typeof amount !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      )
    }

    // ambil role dari Role collection
    const roleDoc = await Role.findOne({ userId: id }).lean()
    const role = roleDoc?.activeRole

    const updated = await Balance.findOneAndUpdate(
      { userId: id },
      { $set: { role }, $inc: { amount } },
      { new: true, upsert: true }
    )

    return NextResponse.json({ success: true, balance: updated })
  } catch (err) {
    console.error("❌ POST /api/balance/[id] error:", err)
    return NextResponse.json(
      { success: false, error: "Failed to update balance" },
      { status: 500 }
    )
  }
}
