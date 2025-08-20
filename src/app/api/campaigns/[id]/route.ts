import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Campaign } from "@/models/Campaign"
import { Types } from "mongoose"

// ✅ PUT: update campaign by ID
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect()

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  try {
    const body = await req.json()
    const updated = await Campaign.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    )
  }
}

// ✅ DELETE: hapus campaign by ID (jika belum ada contributors)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect()

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  try {
    const campaign = await Campaign.findById(params.id)
    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (campaign.contributors && campaign.contributors > 0) {
      return NextResponse.json(
        { error: "Cannot delete campaign with submissions" },
        { status: 400 }
      )
    }

    await Campaign.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    )
  }
}
