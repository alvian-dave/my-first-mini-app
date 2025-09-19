// /src/app/api/task/verify/route.ts
import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { auth } from '@/auth'
import { Campaign } from '@/models/Campaign'
import SocialAccount from '@/models/SocialAccount'
import Submission from '@/models/Submission'

type ServiceName = 'twitter' | 'discord' | 'telegram'

interface CampaignTask {
  service: ServiceName
  type: string
  url: string
}

interface SubmissionTask {
  service: ServiceName
  type: string
  url: string
  done?: boolean
  verifiedAt?: Date
}

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

  // 1) Auth
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2) Parse body
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const { campaignId, task } = body as { campaignId?: string; task?: { service?: string; type?: string; url?: string } }
  if (!campaignId || !task?.service || !task?.type || !task?.url) {
    return NextResponse.json({ error: 'Missing campaignId or task fields' }, { status: 400 })
  }

  const service = task.service as ServiceName
  const incomingTask: CampaignTask = {
    service,
    type: task.type,
    url: task.url,
  }

  // 3) Load campaign
  const campaignDoc = await Campaign.findById(campaignId)
  if (!campaignDoc) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const campaignTasks = (Array.isArray((campaignDoc as any).tasks) ? (campaignDoc as any).tasks : []) as CampaignTask[]
  if (!Array.isArray(campaignTasks)) return NextResponse.json({ error: 'Campaign tasks invalid' }, { status: 500 })

  // 4) Ensure task exists in campaign
  const taskInCampaign = campaignTasks.find((t) =>
    t.service === incomingTask.service && t.type === incomingTask.type && t.url === incomingTask.url
  )
  if (!taskInCampaign) return NextResponse.json({ error: 'Task not in campaign' }, { status: 400 })

  // 5) Service-specific verification (Twitter)
  if (incomingTask.service === 'twitter') {
    try {
      const social = await SocialAccount.findOne({ userId: session.user.id, provider: 'twitter' })
      if (!social?.accessToken || !social?.socialId) {
        return NextResponse.json({ error: 'Twitter not connected', code: 'TWITTER_NOT_CONNECTED' }, { status: 400 })
      }

      // extract username from URL
      let usernameToCheck: string
      try {
        const u = new URL(incomingTask.url)
        usernameToCheck = u.pathname.replace(/^\/+|\/+$/g, '')
        if (!usernameToCheck) throw new Error('empty username')
      } catch {
        return NextResponse.json({ error: 'Invalid Twitter URL in task' }, { status: 400 })
      }

      // fetch following safely
      const followUrl = `https://api.twitter.com/2/users/${social.socialId}/following?max_results=1000`
      const twitterRes = await fetch(followUrl, {
        headers: { Authorization: `Bearer ${social.accessToken}` },
      })

      if (!twitterRes.ok) {
        const text = await twitterRes.text().catch(() => '')
        console.error('Twitter API error (following):', twitterRes.status, text)
        return NextResponse.json({ error: 'Failed to fetch Twitter following' }, { status: 400 })
      }

      const raw = await twitterRes.text().catch(() => '')
      let twitterData: TwitterFollowingResponse = {}
      try {
        twitterData = raw ? (JSON.parse(raw) as TwitterFollowingResponse) : {}
      } catch (err) {
        console.error('Twitter JSON parse error', err, raw)
        return NextResponse.json({ error: 'Invalid response from Twitter' }, { status: 500 })
      }

      const followers = Array.isArray(twitterData.data) ? twitterData.data : []
      const isFollowing = followers.some((u) => u?.username?.toLowerCase() === usernameToCheck.toLowerCase())
      if (!isFollowing) {
        return NextResponse.json({ error: 'Twitter task not completed (not following target)' }, { status: 400 })
      }
    } catch (err) {
      console.error('Twitter verification exception', err)
      return NextResponse.json({ error: 'Twitter verification error' }, { status: 500 })
    }
  }

  // 6) Update or create Submission
  const now = new Date()
  let submission = await Submission.findOne({ userId: session.user.id, campaignId })

  const newTask: SubmissionTask = { ...incomingTask, done: true, verifiedAt: now }

  if (!submission) {
    submission = await Submission.create({
      userId: session.user.id,
      campaignId,
      tasks: [newTask],
      status: campaignTasks.length === 1 ? 'submitted' : 'pending',
    })
  } else {
    const subTasks = Array.isArray((submission as any).tasks) ? (submission as any).tasks : []
    const idx = subTasks.findIndex((s) =>
      s.service === newTask.service && s.type === newTask.type && s.url === newTask.url
    )
    if (idx >= 0) subTasks[idx] = newTask
    else subTasks.push(newTask)

    submission.tasks = subTasks
    submission.status = campaignTasks.every((ct) =>
      submission.tasks.some((st) => st.service === ct.service && st.type === ct.type && st.url === ct.url && st.done)
    )
      ? 'submitted'
      : 'pending'

    await submission.save()
  }

  // 7) Return response
  return NextResponse.json({ success: true, status: submission.status })
}
