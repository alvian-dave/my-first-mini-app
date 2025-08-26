import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Balance from "@/models/Balance"

// ✅ GET /api/balance/[id]
export async function GET(
  _req: Request,
  context: { params: { id: string } }
) {
  await dbConnect()

  try {
    const id = context.params.id
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      )
    }

    const balance = await Balance.findOne({ userId: id }).lean()

    if (!balance) {
      return NextResponse.json({
        success: true,
        balance: { userId: id, amount: 0, role: "hunter" },
      })
    }

    return NextResponse.json({ success: true, balance })
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
  context: { params: { id: string } }
) {
  await dbConnect()

  try {
    const id = context.params.id
    const { amount, role } = await req.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      )
    }

    if (typeof amount !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      )
    }

    const updated = await Balance.findOneAndUpdate(
      { userId: id },
      { $set: { role: role || "hunter" }, $inc: { amount } },
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
