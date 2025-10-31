import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Campaign } from "@/models/Campaign"
import Submission from "@/models/Submission"
import { Notification } from "@/models/Notification"
import { Types } from "mongoose"
import { auth } from "@/auth"
import { rescueCampaignFunds } from "@/lib/rescue"

type ParamsPromise = Promise<{ id: string }>

const EXPLORER_BASE = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://worldscan.org/tx/"

// ==========================
// PUT: update campaign by ID (Promoter only)
// Supports normal updates via body, or action: "finish" to trigger rescue
// ==========================
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

    // If action === "finish", perform rescue of remaining funds and mark finished
    if (body?.action === "finish") {
      const campaign = await Campaign.findById(id)
      if (!campaign) {
        return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 })
      }

      if (campaign.createdBy !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      try {
        const result = await rescueCampaignFunds(campaign)

        if (result.rescued) {
          const txHash = result.txHash
          const txLink = `${EXPLORER_BASE}/${txHash}`

          await Notification.create({
            userId: campaign.createdBy,
            role: "promoter",
            type: "campaign_finished",
            message: `Your campaign "${campaign.title}" has been finished and remaining WR has been returned to your wallet.`,
            metadata: {
              txHash,
              txLink,
              campaignId: campaign._id?.toString(),
            },
          })

          return NextResponse.json({
            success: true,
            message: "Campaign finished and funds rescued",
            txHash,
            txLink,
            campaign: campaign.toObject(),
          })
        } else {
          // nothing to rescue, still mark finished
          campaign.status = "finished"
          await campaign.save()
          await Notification.create({
            userId: campaign.createdBy,
            role: "promoter",
            type: "campaign_finished",
            message: `Your campaign "${campaign.title}" has been finished. No remaining WR to rescue.`,
            metadata: { campaignId: campaign._id?.toString() },
          })
          return NextResponse.json({
            success: true,
            message: "Campaign finished, no remaining funds",
            campaign: campaign.toObject(),
          })
        }
      } catch (err: any) {
        campaign.error = err?.message || String(err)
        await campaign.save()
        console.error("Failed to rescue funds:", err)
        return NextResponse.json(
          { error: "Failed to rescue funds", detail: err?.message || String(err) },
          { status: 500 }
        )
      }
    }

    // Default: normal update (only promoter or admin)
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

// ==========================
// PATCH: hunter submit task → create/update submission (NO REWARD YET)
// ==========================
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

// ==========================
// DELETE: delete campaign by ID
// If campaign has contributors: cannot delete
// If remainingWR > 0: rescue then soft-delete (mark finished + deleted_by_promoter) and notify promoter with tx link
// ==========================
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

    // if there are remaining funds, rescue them first
    const remaining = BigInt(campaign.remainingWR || "0")
    if (remaining > 0n) {
      try {
        const result = await rescueCampaignFunds(campaign)
        if (result.rescued) {
          const txHash = result.txHash
          const txLink = `${EXPLORER_BASE}/${txHash}`

          // soft-delete: mark finished and deleted_by_promoter
          campaign.status = "finished"
          campaign.error = campaign.error || "deleted_by_promoter"
          await campaign.save()

          // notify promoter with tx link
          await Notification.create({
            userId: campaign.createdBy,
            role: "promoter",
            type: "campaign_deleted",
            message: `Your campaign "${campaign.title}" has been deleted and remaining ${campaign.reward} WR was returned to your wallet.`,
            metadata: {
              txHash,
              txLink,
              campaignId: campaign._id?.toString(),
            },
          })

          return NextResponse.json({ success: true, txHash, txLink })
        } else {
          // nothing to rescue -> proceed to delete
          await Campaign.findByIdAndDelete(id)
          await Notification.create({
            userId: campaign.createdBy,
            role: "promoter",
            type: "campaign_deleted",
            message: `Your campaign "${campaign.title}" has been deleted. No remaining WR to rescue.`,
            metadata: { campaignId: campaign._id?.toString() },
          })
          return NextResponse.json({ success: true })
        }
      } catch (err: any) {
        campaign.error = err?.message || String(err)
        await campaign.save()
        console.error("Failed to rescue funds during delete:", err)
        return NextResponse.json({ error: "Failed to rescue funds", detail: err?.message || String(err) }, { status: 500 })
      }
    }

    // no remaining funds -> safe to delete
    await Campaign.findByIdAndDelete(id)
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