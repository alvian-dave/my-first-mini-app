import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Campaign } from "@/models/Campaign"
import { Types } from "mongoose"
import { auth } from "@/auth"

type ParamsPromise = Promise<{ id: string }>

// ✅ PUT: update campaign by ID (Next.js 15)
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
    const updated = await Campaign.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
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
//   - Hanya menaikkan "contributors" supaya promoter lihat naik
//   - TIDAK memaksa ubah status global campaign
export async function PATCH(
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
    const updated = await Campaign.findByIdAndUpdate(
      id,
      { $inc: { contributors: 1 } },  // ← atomic increment
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to update contributors" },
      { status: 500 }
    )
  }
}

// ✅ DELETE: hapus campaign by ID (block jika sudah ada contributors)
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
    const campaign = await Campaign.findById(id)
    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
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
