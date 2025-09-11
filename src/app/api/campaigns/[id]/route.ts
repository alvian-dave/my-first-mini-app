import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Campaign } from "@/models/Campaign"
import Balance from "@/models/Balance"
import { Notification } from "@/lib/models/Notification"
import { Types } from "mongoose"
import { auth } from "@/auth"

type ParamsPromise = Promise<{ id: string }>

// ✅ PUT: update campaign by ID (Promoter hanya bisa update campaign miliknya)
export async function PUT(
  req: Request,
  { params }: { params: ParamsPromise }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

    // ✅ Buat notifikasi untuk promoter
    await Notification.create({
      userId: session.user.id,
      role: "promoter",
      type: "campaign_updated",
      message: `Campaign "${updated.title}" berhasil diupdate`,
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 })
  }
}

// ✅ PATCH: hunter submit task
export async function PATCH(
  _req: Request,
  { params }: { params: ParamsPromise }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await dbConnect()

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, participants: { $ne: session.user.id } },
      { $addToSet: { participants: session.user.id }, $inc: { contributors: 1 } },
      { new: true }
    )

    if (!campaign) {
      return NextResponse.json({ error: "Not found / already submitted" }, { status: 400 })
    }

    const rewardNum = parseFloat(campaign.reward as unknown as string) || 0

    // Update balance hunter
    await Balance.findOneAndUpdate(
      { userId: session.user.id },
      { $inc: { amount: rewardNum }, $setOnInsert: { role: "hunter" } },
      { new: true, upsert: true }
    )

    // ✅ Notifikasi untuk hunter
    await Notification.create({
      userId: session.user.id,
      role: "hunter",
      type: "task_submitted",
      message: `Anda berhasil submit task untuk campaign "${campaign.title}"`,
    })

    // ✅ Notifikasi untuk promoter campaign
    await Notification.create({
      userId: campaign.createdBy,
      role: "promoter",
      type: "task_submitted",
      message: `Hunter "${session.user.username}" submit task di campaign "${campaign.title}"`,
    })

    return NextResponse.json(campaign)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to update contributors / balance" },
      { status: 500 }
    )
  }
}

// ✅ DELETE: hapus campaign by ID
export async function DELETE(
  _req: Request,
  { params }: { params: ParamsPromise }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await dbConnect()

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  try {
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

    // ✅ Notifikasi untuk promoter
    await Notification.create({
      userId: session.user.id,
      role: "promoter",
      type: "campaign_deleted",
      message: `Campaign "${campaign.title}" berhasil dihapus`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 })
  }
}
