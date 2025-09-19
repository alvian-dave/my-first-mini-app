// /api/task/verify/route.ts
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
  if (!Array.isArray(campaign.tasks)) {
    return NextResponse.json({ error: 'Campaign tasks data is invalid' }, { status: 500 })
  }

  const taskInCampaign = campaign.tasks.find(
    (t: any) => t.service === task.service && t.type === task.type && t.url === task.url
  )
  if (!taskInCampaign) return NextResponse.json({ error: 'Task not in campaign' }, { status: 400 })

  // ====== Twitter verification ======
  if (task.service === 'twitter') {
    const social = await SocialAccount.findOne({ userId: session.user.id, provider: 'twitter' })
    if (!social) return NextResponse.json({ error: 'Twitter not connected', code: 'TWITTER_NOT_CONNECTED' }, { status: 400 })

    // Panggil Twitter API untuk cek follow
    // Ambil username target dari URL task
    const urlObj = new URL(task.url)
    const targetUsername = urlObj.pathname.replace('/', '')

    // Twitter API: GET following list (note: bisa gunakan pagination jika banyak following)
    const twitterRes = await fetch(`https://api.twitter.com/2/users/${social.socialId}/following`, {
      headers: { Authorization: `Bearer ${social.accessToken}` },
    })
    const twitterData = await twitterRes.json()

    const isFollowing = twitterData.data?.some((u: any) => u.username.toLowerCase() === targetUsername.toLowerCase())
    if (!isFollowing) return NextResponse.json({ error: 'Twitter task not completed' }, { status: 400 })
  }

  // ====== Update Submission ======
  let submission = await Submission.findOne({ userId: session.user.id, campaignId })
  const verifiedTask = { ...task, done: true, verifiedAt: new Date().toISOString() }

  if (!submission) {
    submission = await Submission.create({
      userId: session.user.id,
      campaignId,
      tasks: [verifiedTask],
      status: 'pending', // sementara
    })
  } else {
    const tasks = submission.tasks.map((t) =>
      t.service === task.service && t.type === task.type && t.url === task.url
        ? verifiedTask
        : t
    )
    // Kalau task belum ada sebelumnya, tambahkan
    if (!submission.tasks.some(t => t.service === task.service && t.type === task.type && t.url === task.url)) {
      tasks.push(verifiedTask)
    }
    submission.tasks = tasks
  }

  // ====== Tentukan status submitted/pending ======
  const totalCampaignTasks = campaign.tasks.length
  const doneTasksCount = submission.tasks.filter(t => t.done).length

  if (doneTasksCount === totalCampaignTasks) {
    submission.status = 'submitted'
  } else {
    submission.status = 'pending'
  }

  await submission.save()

  return NextResponse.json({ success: true, status: submission.status })
}
