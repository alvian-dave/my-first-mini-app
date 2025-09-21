import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Campaign } from "@/models/Campaign"
import Balance from "@/models/Balance"
import Submission from "@/models/Submission"
import { Notification } from "@/models/Notification"
import { Types } from "mongoose"
import { auth } from "@/auth"

type ParamsPromise = Promise<{ id: string }>

// ✅ PUT: update campaign by ID (Promoter only)
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

    // ✅ Notification for promoter
    await Notification.create({
      userId: session.user.id,
      role: "promoter",
      type: "campaign_updated",
      message: `Your campaign "${updated.title}" has been successfully updated.`,
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 })
  }
}

// ✅ PATCH: hunter submit task → create/update submission (NO REWARD YET)
export async function PATCH(
  req: Request,
  { params }: { params: ParamsPromise }
) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await dbConnect()

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  try {
    const campaign = await Campaign.findById(id)
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // cek apakah sudah ada submission hunter
    let submission = await Submission.findOne({
      userId: session.user.id,
      campaignId: id,
    })

    if (!submission) {
      // buat submission baru, copy tasks dari campaign
      submission = await Submission.create({
        userId: session.user.id,
        campaignId: id,
        tasks: campaign.tasks.map((t: any) => ({
          service: t.service,
          type: t.type,
          url: t.url || "",
          status: "pending",
        })),
        status: "in_progress",
      })
    } else {
      // update status kalau sudah pernah submit
      submission.status = "in_progress"
      await submission.save()
    }

    // ✅ Notification untuk hunter
    await Notification.create({
      userId: session.user.id,
      role: "hunter",
      type: "task_submitted",
      message: `You started a submission for the campaign "${campaign.title}".`,
    })

    // ✅ Notification untuk promoter
    await Notification.create({
      userId: campaign.createdBy,
      role: "promoter",
      type: "task_submitted",
      message: `Hunter "${session.user.username || session.user.id}" started a submission for your campaign "${campaign.title}".`,
    })

    return NextResponse.json({
      success: true,
      campaign: campaign.toObject(),
      submission: submission.toObject(),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to create/update submission" },
      { status: 500 }
    )
  }
}

// ✅ DELETE: delete campaign by ID
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

    // ✅ Notification for promoter
    await Notification.create({
      userId: session.user.id,
      role: "promoter",
      type: "campaign_deleted",
      message: `Your campaign "${campaign.title}" has been successfully deleted.`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 })
  }
}
