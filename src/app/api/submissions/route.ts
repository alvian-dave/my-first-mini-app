import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Submission from "@/models/Submission"
import { Campaign } from "@/models/Campaign"
import { Notification } from "@/models/Notification"
import { auth } from "@/auth"
import { rewardHunter } from "@/lib/rewardHunter"

// ✅ definisi Task biar gak implicit any
type Task = {
  service: string
  type: string
  url: string
  done?: boolean
  verifiedAt?: Date
}

/* ======================================================
   GET — ❌ TIDAK DIUBAH (AMAN)
====================================================== */
export async function GET(req: Request) {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get("campaignId")

  if (campaignId) {
    const campaign = await Campaign.findById(campaignId).lean()
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const submission = await Submission.findOne({
      userId: session.user.id,
      campaignId,
    }).lean()

    const campaignTasks: Task[] = Array.isArray((campaign as any).tasks)
      ? (campaign as any).tasks
      : []

    let mergedTasks: Task[] = campaignTasks

    if (submission) {
      const submissionTasks: Task[] = Array.isArray((submission as any).tasks)
        ? (submission as any).tasks
        : []

      mergedTasks = campaignTasks.map((ct: Task) => {
        const matched = submissionTasks.find(
          (st: Task) =>
            st.service === ct.service &&
            st.type === ct.type &&
            st.url === ct.url
        )
        return matched
          ? { ...ct, done: matched.done, verifiedAt: matched.verifiedAt }
          : { ...ct, done: false }
      })
    } else {
      mergedTasks = campaignTasks.map((ct: Task) => ({ ...ct, done: false }))
    }

    return NextResponse.json({
      submission: submission
        ? { ...submission, tasks: mergedTasks }
        : {
            userId: session.user.id,
            campaignId,
            tasks: mergedTasks,
            status: "pending",
          },
    })
  }

  const submissions = await Submission.find({
    userId: session.user.id,
  }).lean()

  return NextResponse.json({ submissions })
}

/* ======================================================
   POST — 🔥 FIX TOTAL DOUBLE REWARD
====================================================== */
export async function POST(req: Request) {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { campaignId } = await req.json()
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 })
  }

  /* ======================================================
     1️⃣ ATOMIC LOCK (INI FIX UTAMA)
  ====================================================== */
  const submission = await Submission.findOneAndUpdate(
    {
      userId: session.user.id,
      campaignId,
      status: "submitted",
      rewarded: { $ne: true },
      rewardStatus: { $in: ["none", undefined, "failed"] },
    },
    {
      $set: {
        rewardStatus: "pending_onchain", // 🔒 LOCK
        rewardRequestedAt: new Date(),
      },
    },
    { new: true }
  )

  if (!submission) {
    return NextResponse.json(
      {
        error:
          "Reward already processed or currently being processed. Please wait.",
      },
      { status: 409 }
    )
  }

  /* ======================================================
     2️⃣ Ambil campaign aktif (TETAP)
  ====================================================== */
  const campaign = await Campaign.findOne({
    _id: campaignId,
    status: "active",
  })

  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found or inactive" },
      { status: 404 }
    )
  }

  const remainingWei = BigInt(campaign.remainingWR || "0")
  if (remainingWei === 0n) {
    return NextResponse.json(
      { error: "Campaign has insufficient remaining funds" },
      { status: 400 }
    )
  }

  /* ======================================================
     3️⃣ Update participants (AMAN)
  ====================================================== */
  if (!campaign.participants.includes(session.user.id)) {
    campaign.participants.push(session.user.id)
    campaign.contributors = campaign.participants.length
    await campaign.save()
  }

  let txHash: string | undefined

  try {
    /* ======================================================
       4️⃣ EXECUTE ON-CHAIN (TETAP)
    ====================================================== */
    await rewardHunter(session.user.walletAddress, campaign)

    const updatedCampaign = await Campaign.findById(campaignId)
    const lastTx = (updatedCampaign?.transactions || []).slice(-1)[0]
    txHash = lastTx?.txHash

    /* ======================================================
       5️⃣ FINALIZE SUBMISSION (SUCCESS)
    ====================================================== */
    submission.rewarded = true
    submission.rewardStatus = "onchain_confirmed"
    submission.rewardTxHash = txHash
    submission.rewardOnchainAt = new Date()
    submission.rewardAmount = campaign.reward
    await submission.save()

    /* ======================================================
       6️⃣ NOTIFICATIONS (TETAP)
    ====================================================== */
    const explorerBase =
      process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ||
      "https://worldscan.org/tx/"
    const txLink = txHash ? `${explorerBase}${txHash}` : undefined

    await Notification.create({
      userId: session.user.id,
      role: "hunter",
      type: "submission_completed",
      message: `You have successfully completed the campaign "${campaign.title}" and earned ${campaign.reward} WR Credit.`,
      metadata: {
        txHash,
        txLink,
        campaignId: campaign._id?.toString(),
      },
    })

    await Notification.create({
      userId: campaign.createdBy,
      role: "promoter",
      type: "submission_completed",
      message: `Hunter "${session.user.username || session.user.id}" has successfully completed your campaign "${campaign.title}".`,
      metadata: {
        txHash,
        txLink,
        campaignId: campaign._id?.toString(),
        hunterId: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      submission: submission.toObject(),
      campaign: updatedCampaign
        ? updatedCampaign.toObject()
        : campaign.toObject(),
      txHash,
    })
  } catch (err: any) {
    /* ======================================================
       7️⃣ ERROR PATH (RETRY MASIH AMAN)
    ====================================================== */
    submission.rewardStatus = "failed"
    submission.rewardError = err?.message || String(err)
    await submission.save()

    campaign.error = err?.message || String(err)
    await campaign.save()

    return NextResponse.json(
      {
        error: "Failed to execute on-chain reward",
        detail: err?.message || String(err),
      },
      { status: 500 }
    )
  }
}
