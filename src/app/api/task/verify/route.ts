// /api/task/verify/route.ts
import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { auth } from '@/auth'
import { Campaign } from '@/models/Campaign'
import SocialAccount from '@/models/SocialAccount'
import Submission from '@/models/Submission'
import fetch from 'node-fetch'

// TypeScript interfaces untuk Twitter API response
interface TwitterUser {
  id: string
  username: string
}

interface TwitterFollowingResponse {
  data?: TwitterUser[]
  meta?: any
}

export async function POST(req: Request) {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { campaignId, task } = body as {
    campaignId: string
    task: { service: string; type: string; url: string }
  }

  if (!campaignId || !task) {
    return NextResponse.json({ error: 'Missing campaignId or task' }, { status: 400 })
  }

  // Ambil campaign
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Pastikan campaign.tasks array valid
  if (!Array.isArray(campaign.tasks)) {
    return NextResponse.json({ error: 'Campaign tasks data is invalid' }, { status: 500 })
  }

  // Cari task yang dimaksud
  const taskInCampaign = campaign.tasks.find(
    (t) =>
      t.service === task.service &&
      t.type === task.type &&
      t.url === task.url
  )
  if (!taskInCampaign) {
    return NextResponse.json({ error: 'Task not in campaign' }, { status: 400 })
  }

  // ===== Twitter task verification =====
  if (task.service === 'twitter') {
    const social = await SocialAccount.findOne({ userId: session.user.id, provider: 'twitter' })
    if (!social) {
      return NextResponse.json(
        { error: 'Twitter not connected', code: 'TWITTER_NOT_CONNECTED' },
        { status: 400 }
      )
    }

    // ambil username target dari URL
    const urlObj = new URL(task.url)
    const usernameToCheck = urlObj.pathname.replace('/', '')

    // panggil Twitter API untuk following
    const twitterRes = await fetch(
      `https://api.twitter.com/2/users/${social.socialId}/following`,
      { headers: { Authorization: `Bearer ${social.accessToken}` } }
    )
    const twitterData: TwitterFollowingResponse = (await twitterRes.json()) as TwitterFollowingResponse

    const isFollowing = twitterData.data?.some(
      (u) => u.username.toLowerCase() === usernameToCheck.toLowerCase()
    )

    if (!isFollowing) {
      return NextResponse.json({ error: 'Twitter task not completed' }, { status: 400 })
    }
  }

  // ===== Update Submission =====
  let submission = await Submission.findOne({ userId: session.user.id, campaignId })
  const now = new Date()
  if (!submission) {
    submission = await Submission.create({
      userId: session.user.id,
      campaignId,
      tasks: [{ ...task, done: true, verifiedAt: now }],
      status: 'pending',
    })
  } else {
    // update task yang selesai
    submission.tasks = submission.tasks.map((t) =>
      t.service === task.service && t.type === task.type && t.url === task.url
        ? { ...t.toObject(), done: true, verifiedAt: now }
        : t
    )
  }

  // ===== Update submission status hanya jika semua task selesai =====
  const allTasksInCampaignDone =
    campaign.tasks.length === submission.tasks.filter((t) => t.done).length
  if (allTasksInCampaignDone) {
    submission.status = 'submitted'
  }

  await submission.save()

  return NextResponse.json({ success: true, status: submission.status })
}
