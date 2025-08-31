import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Campaign } from "@/models/Campaign"
import Balance from "@/models/Balance"
import { Types } from "mongoose"
import { auth } from "@/auth"

type ParamsPromise = Promise<{ id: string }>

// ✅ PUT: update campaign by ID (Promoter hanya bisa update campaign miliknya)
export async function PUT(
  req: Request,
  { params }: { params: ParamsPromise }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await dbConnect()

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  try {
    const body = await req.json()

    // Hanya update campaign yang dibuat oleh user ini
    const updated = await Campaign.findOneAndUpdate(
      { _id: id, createdBy: session.user.id },
      { $set: body },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    )
  }
}

// ✅ PATCH: increment contributors (atomic) ketika hunter submit task
//    + update balance hunter
export async function PATCH(
  _req: Request,
  { params }: { params: ParamsPromise }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await dbConnect()

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  try {
    const campaign = await Campaign.findByIdAndUpdate(
      id,
      { $inc: { contributors: 1 } },
      { new: true }
    )

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Ambil reward campaign, pastikan numeric
    const rewardNum = parseFloat(campaign.reward as unknown as string) || 0

    // Update balance hunter di DB
    await Balance.findOneAndUpdate(
      { userId: session.user.id },
      { $inc: { amount: rewardNum }, $setOnInsert: { role: "hunter" } },
      { new: true, upsert: true }
    )

    return NextResponse.json(campaign)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to update contributors / balance" },
      { status: 500 }
    )
  }
}

// ✅ DELETE: hapus campaign by ID (hanya jika milik user dan contributors = 0)
export async function DELETE(
  _req: Request,
  { params }: { params: ParamsPromise }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await dbConnect()

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  try {
    // Hanya hapus campaign yang dibuat user ini
    const campaign = await Campaign.findOne({ _id: id, createdBy: session.user.id })

    if (!campaign) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 })
    }

    if (campaign.contributors && campaign.contributors > 0) {
      return NextResponse.json(
        { error: "Cannot delete campaign with submissions" },
        { status: 400 }
      )
    }

    await Campaign.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    )
  }
}
