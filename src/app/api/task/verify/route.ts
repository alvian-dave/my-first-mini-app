// /api/task/verify.ts
import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { auth } from '@/auth'
import { Campaign } from '@/models/Campaign'
import SocialAccount from '@/models/SocialAccount'
import Submission from '@/models/Submission'
import fetch from 'node-fetch'

export async function POST(req: Request) {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { campaignId, task } = body as { campaignId: string; task: { service: string; type: string; url: string } }

  if (!campaignId || !task) {
    return NextResponse.json({ error: 'Missing campaignId or task' }, { status: 400 })
  }

  const campaign = await Campaign.findById(campaignId).lean()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const taskInCampaign = campaign.tasks.find(
    (t: any) => t.service === task.service && t.type === task.type && t.url === task.url
  )
  if (!taskInCampaign) return NextResponse.json({ error: 'Task not in campaign' }, { status: 400 })

  // ====== cek Twitter task ======
  if (task.service === 'twitter') {
    const social = await SocialAccount.findOne({ userId: session.user.id, provider: 'twitter' })
    if (!social) return NextResponse.json({ error: 'Twitter not connected', code: 'TWITTER_NOT_CONNECTED' }, { status: 400 })

    // Production: panggil Twitter API untuk verifikasi
    // Misal endpoint: GET https://api.twitter.com/2/users/:hunterId/following/:targetId
    const url = new URL(task.url)
    const usernameToCheck = url.pathname.replace('/', '')

    const twitterRes = await fetch(`https://api.twitter.com/2/users/${social.socialId}/following`, {
      headers: { Authorization: `Bearer ${social.accessToken}` },
    })
    const twitterData = await twitterRes.json()

    const isFollowing = twitterData.data?.some((u: any) => u.username.toLowerCase() === usernameToCheck.toLowerCase())
    if (!isFollowing) return NextResponse.json({ error: 'Twitter task not completed' }, { status: 400 })
  }

  // ====== update Submission ======
  let submission = await Submission.findOne({ userId: session.user.id, campaignId })
  if (!submission) {
    submission = await Submission.create({
      userId: session.user.id,
      campaignId,
      tasks: [{ ...task, done: true, verifiedAt: new Date().toISOString() }],
      status: 'pending',
    })
  } else {
    const tasks = submission.tasks.map((t) =>
      t.service === task.service && t.type === task.type && t.url === task.url
        ? { ...t, done: true, verifiedAt: new Date().toISOString() }
        : t
    )
    submission.tasks = tasks
    await submission.save()
  }

  return NextResponse.json({ success: true })
}
