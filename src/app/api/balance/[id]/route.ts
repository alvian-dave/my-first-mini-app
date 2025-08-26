import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Balance from "@/models/Balance"
import { auth } from "@/auth"

// GET /api/balance/[id] → pakai auth
export async function GET() {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = session.user.id
    const balance = await Balance.findOne({ userId }).lean()

    if (!balance) {
      return NextResponse.json({
        success: true,
        balance: { userId, amount: 0, role: session.user.role || undefined },
      })
    }

    return NextResponse.json({ success: true, balance })
  } catch (err) {
    console.error("GET /api/balance error:", err)
    return NextResponse.json(
      { success: false, error: "Failed to fetch balance" },
      { status: 500 }
    )
  }
}

// POST /api/balance/[id] → update atau create balance, pakai auth
export async function POST(req: Request) {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = session.user.id
    const { amount, role } = await req.json()

    if (typeof amount !== "number") {
      return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 })
    }

    const updateObj: any = { $inc: { amount } }
    if (role !== undefined) updateObj.$set = { role }

    const updated = await Balance.findOneAndUpdate(
      { userId },
      updateObj,
      { new: true, upsert: true }
    )

    return NextResponse.json({ success: true, balance: updated })
  } catch (err) {
    console.error("POST /api/balance error:", err)
    return NextResponse.json(
      { success: false, error: "Failed to update balance" },
      { status: 500 }
    )
  }
}
