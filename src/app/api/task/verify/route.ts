// /api/task/verify/route.ts
import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { auth } from '@/auth'
import { Campaign } from '@/models/Campaign'
import SocialAccount from '@/models/SocialAccount'
import Submission from '@/models/Submission'
import fetch from 'node-fetch'

interface VerifyTaskBody {
  campaignId: string
  task: {
    service: 'twitter' | 'discord' | 'telegram'
    type: string
    url: string
  }
}

export async function POST(req: Request) {
  await dbConnect()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as VerifyTaskBody
  const { campaignId, task } = body

  if (!campaignId || !task) {
    return NextResponse.json({ error: 'Missing campaignId or task' }, { status: 400 })
  }

  const campaign = await Campaign.findById(campaignId).lean()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  if (!Array.isArray(campaign.tasks)) {
    return NextResponse.json({ error: 'Campaign tasks data is invalid' }, { status: 500 })
  }

  const taskInCampaign = campaign.tasks.find(
    (t) => t.service === task.service && t.type === task.type && t.url === task.url
  )
  if (!taskInCampaign) return NextResponse.json({ error: 'Task not in campaign' }, { status: 400 })

  // ===== Twitter verification =====
  if (task.service === 'twitter') {
    const social = await SocialAccount.findOne({ userId: session.user.id, provider: 'twitter' })
    if (!social) {
      return NextResponse.json(
        { error: 'Twitter not connected', code: 'TWITTER_NOT_CONNECTED' },
        { status: 400 }
      )
    }

    try {
      // extract username from URL
      const url = new URL(task.url)
      const usernameToCheck = url.pathname.replace('/', '')

      // panggil API Twitter untuk cek following
      const twitterRes = await fetch(`https://api.twitter.com/2/users/${social.socialId}/following`, {
        headers: { Authorization: `Bearer ${social.accessToken}` },
      })

      if (!twitterRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch Twitter following' }, { status: 500 })
      }

      const twitterData = await twitterRes.json()
      const isFollowing = Array.isArray(twitterData.data)
        ? twitterData.data.some((u: any) => u.username.toLowerCase() === usernameToCheck.toLowerCase())
        : false

      if (!isFollowing) {
        return NextResponse.json({ error: 'Twitter task not completed' }, { status: 400 })
      }
    } catch (err) {
      console.error('Twitter verification failed', err)
      return NextResponse.json({ error: 'Twitter verification failed' }, { status: 500 })
    }
  }

  // ===== Update or create submission =====
  let submission = await Submission.findOne({ userId: session.user.id, campaignId })
  const taskWithVerified = { ...task, done: true, verifiedAt: new Date().toISOString() }

  if (!submission) {
    submission = await Submission.create({
      userId: session.user.id,
      campaignId,
      tasks: [taskWithVerified],
      status: 'submitted', // production: langsung submitted
    })
  } else {
    const existingTasks = submission.tasks || []
    const taskExists = existingTasks.find(
      (t) => t.service === task.service && t.type === task.type && t.url === task.url
    )

    if (taskExists) {
      submission.tasks = existingTasks.map((t) =>
        t.service === task.service && t.type === task.type && t.url === task.url
          ? taskWithVerified
          : t
      )
    } else {
      submission.tasks.push(taskWithVerified)
    }

    // jika semua task campaign sudah diverifikasi → status submitted
    const allTasksVerified =
      campaign.tasks.every((t) =>
        submission.tasks.some(
          (st) => st.service === t.service && st.type === t.type && st.url === t.url && st.done
        )
      )
    submission.status = allTasksVerified ? 'submitted' : 'pending'
    await submission.save()
  }

  return NextResponse.json({ success: true })
}
