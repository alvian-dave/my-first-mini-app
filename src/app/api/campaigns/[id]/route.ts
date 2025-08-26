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

    const updated = await Campaign.findOneAndUpdate(
      { _id: id, createdBy: session.user.id },
      { $set: body },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json(
        { error: "Not found or unauthorized" },
        { status: 404 }
      )
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

// ✅ PATCH: hunter submit OR promoter finish
export async function PATCH(
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

    // Hunter submit → increment contributors
    if (body.action === "contribute") {
      const updated = await Campaign.findByIdAndUpdate(
        id,
        { $inc: { contributors: 1 } },
        { new: true }
      )

      if (!updated) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }

      return NextResponse.json(updated)
    }

    // Promoter finish → mark finished + refund sisa budget
    if (body.action === "finish") {
      const campaign = await Campaign.findOne({
        _id: id,
        createdBy: session.user.id,
      })
      if (!campaign) {
        return NextResponse.json(
          { error: "Not found or unauthorized" },
          { status: 404 }
        )
      }

      const used = Number(campaign.contributors) * Number(campaign.reward)
      const remaining = Number(campaign.budget) - used

      // refund balance promoter
      if (remaining > 0) {
        let promoterBalance = await Balance.findOne({ userId: session.user.id })
        if (!promoterBalance) {
          promoterBalance = await Balance.create({
            userId: session.user.id,
            amount: 0,
          })
        }
        promoterBalance.amount += remaining
        await promoterBalance.save()
      }

      campaign.status = "finished"
      await campaign.save()
      return NextResponse.json(campaign)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    )
  }
}

// ✅ DELETE: hapus campaign kalau belum ada submissions
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
    const campaign = await Campaign.findOne({
      _id: id,
      createdBy: session.user.id,
    })

    if (!campaign) {
      return NextResponse.json(
        { error: "Not found or unauthorized" },
        { status: 404 }
      )
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
