import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Submission from "@/models/Submission"
import { Campaign } from "@/models/Campaign"
import { Notification } from "@/models/Notification"
import { auth } from "@/auth"
import { rewardHunter } from "@/lib/rewardHunter" // sesuaikan path kalau beda

// ✅ definisi Task biar gak implicit any
type Task = { service: string; type: string; url: string; done?: boolean; verifiedAt?: Date }

export async function GET(req: Request) {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get("campaignId")

  if (campaignId) {
    // ✅ ambil campaign + submission untuk merge
    const campaign = await Campaign.findById(campaignId).lean()
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const submission = await Submission.findOne({
      userId: session.user.id,
      campaignId,
    }).lean()

    // list tasks dari campaign
    const campaignTasks: Task[] = Array.isArray((campaign as any).tasks)
      ? (campaign as any).tasks
      : []

    let mergedTasks: Task[] = campaignTasks

    if (submission) {
      const submissionTasks: Task[] = Array.isArray((submission as any).tasks)
        ? (submission as any).tasks
        : []

      // ✅ merge: ambil task campaign, tambahkan status dari submission kalau ada
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
      // kalau belum ada submission, semua task default done = false
      mergedTasks = campaignTasks.map((ct: Task) => ({ ...ct, done: false }))
    }

    return NextResponse.json({
      submission: submission
        ? { ...submission, tasks: mergedTasks }
        : { userId: session.user.id, campaignId, tasks: mergedTasks, status: "pending" },
    })
  }

  // default → list semua submission hunter
  const submissions = await Submission.find({ userId: session.user.id }).lean()
  return NextResponse.json({ submissions })
}

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

  // ambil submission hunter (mutable document)
  const submission = await Submission.findOne({
    userId: session.user.id,
    campaignId,
  })

  if (!submission) {
    return NextResponse.json(
      { error: "No submission found. Please verify tasks first." },
      { status: 400 }
    )
  }

  // kalau belum semua task done → error (sama seperti sebelumnya)
  if (submission.status !== "submitted") {
    return NextResponse.json(
      { error: "Not all tasks verified yet" },
      { status: 400 }
    )
  }

  // cek apakah sudah pernah diberi reward
  if ((submission as any).rewarded) {
    return NextResponse.json(
      { error: "Submission already rewarded" },
      { status: 400 }
    )
  }

  // ambil campaign yang aktif
  const campaign = await Campaign.findOne({ _id: campaignId, status: "active" })
  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found or inactive" },
      { status: 404 }
    )
  }

  // cek minimal remaining di campaign (helper juga akan handle rescue jika kurang)
  const rewardWei = BigInt(campaign.reward)
  const remainingWei = BigInt(campaign.remainingWR || "0")

  if (remainingWei === 0n) {
    return NextResponse.json(
      { error: "Campaign has insufficient remaining funds" },
      { status: 400 }
    )
  }

  // update participants/contributors only once per hunter
  if (!campaign.participants.includes(session.user.id)) {
    campaign.participants.push(session.user.id)
    campaign.contributors = campaign.participants.length
    await campaign.save()
  }

  // =========================
  // Reserve / mark pending
  // =========================
  submission.rewardStatus = "pending_onchain"
  submission.rewardAmount = campaign.reward
  await submission.save()

  let rewarded = false
  let txHash: string | undefined = undefined

  try {
    // call on-chain helper (this will await tx.wait() per your helper)
    await rewardHunter(session.user.walletAddress, campaign)
    // rewardHunter in your helper updates & saves the campaign.transactions and remainingWR

    // fetch latest campaign (already updated by helper but reload to be safe)
    const updatedCampaign = await Campaign.findById(campaignId)

    // get last reward tx for this payout (helper pushes transactions array)
    const lastTx = (updatedCampaign?.transactions || []).slice(-1)[0]
    txHash = lastTx?.txHash

    // mark submission rewarded
    submission.rewarded = true
    submission.rewardStatus = "onchain_confirmed"
    submission.rewardTxHash = txHash
    submission.rewardOnchainAt = new Date()
    await submission.save()

    rewarded = true

    // Notifications
// build txLink from env + txHash (adjust key name if needed)
const explorerBase = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://worldscan.org/tx/'
const txLink = `${explorerBase}${txHash}`

// Notification untuk Hunter (penerima)
await Notification.create({
  userId: session.user.id,
  role: "hunter",
  type: "submission_completed",
  message: `You have successfully completed the campaign "${campaign.title}" and earned ${campaign.reward} WR Credit.`,
  metadata: {
    txHash: txHash,
    txLink,
    campaignId: campaign._id?.toString(),
  },
})

// Notification untuk Promoter (pemilik campaign)
await Notification.create({
  userId: campaign.createdBy,
  role: "promoter",
  type: "submission_completed",
  message: `Hunter "${session.user.username || session.user.id}" has successfully completed your campaign "${campaign.title}".`,
  metadata: {
    txHash: txHash,
    txLink,
    campaignId: campaign._id?.toString(),
    hunterId: session.user.id,
  },
})

    return NextResponse.json({
      success: true,
      submission: submission.toObject(),
      campaign: updatedCampaign ? updatedCampaign.toObject() : campaign.toObject(),
      txHash,
      alreadyRewarded: !rewarded,
    })
  } catch (err: any) {
    // on error, mark failed and store error message
    submission.rewardStatus = "failed"
    submission.rewardError = err?.message || String(err)
    await submission.save()

    // optionally append campaign.error
    campaign.error = err?.message || String(err)
    await campaign.save()

    return NextResponse.json(
      { error: "Failed to execute on-chain reward", detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}