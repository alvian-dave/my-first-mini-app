import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Submission from '@/models/Submission'
import User from '@/models/User'
import { auth } from '@/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await dbConnect()
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userIdString = userId.toString()
    let userObjId: mongoose.Types.ObjectId;
    
    try {
      userObjId = new mongoose.Types.ObjectId(userIdString);
    } catch (e) {
      // Fallback jika ID bukan format valid ObjectId
      userObjId = userId as any;
    }

    const [userData, statsData, totalUsers, notifications] = await Promise.all([
      User.findById(userId).select('username points').lean(),
      
      // 1. Ambil data Earned & Task Done (Sesuai Logic Leaderboard)
      // Mencari userId dalam format String sesuai data di koleksi Submissions
      Submission.aggregate([
        { $match: { userId: userIdString, rewarded: true } },
        { 
          $group: { 
            _id: null, 
            totalEarned: { $sum: { $toDouble: { $ifNull: ["$rewardAmount", "0"] } } },
            count: { $sum: 1 } 
          } 
        }
      ]),

      User.countDocuments(),

// 2. FIX NOTIFICATIONS: Filter userId DAN role hunter
      mongoose.connection.collection('notifications')
        .find({ 
          $and: [
            { 
              $or: [
                { userId: userIdString },
                { userId: userObjId }
              ] 
            },
            { role: "hunter" } // KUNCINYA DI SINI: Hanya ambil notif buat Hunter
          ]
        })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray()
    ])

    const stats = (statsData as any)[0] || { totalEarned: 0, count: 0 }
    const earned = stats.totalEarned || 0
    const tasksDone = stats.count || 0

    // 3. Logic Rank: Bandingkan poin user ini dengan yang lain
    const currentPoints = (userData as any)?.points || earned;
    const usersAbove = await User.countDocuments({ points: { $gt: currentPoints } })
    const rank = usersAbove + 1
    
    // Neural Sync Persentase
    const neuralSyncPercent = totalUsers > 0 ? (1 - (rank / totalUsers)) * 100 : 0
    const finalSync = Math.max(0.1, neuralSyncPercent).toFixed(1)

    return NextResponse.json({
      ok: true,
      stats: {
        neuralSync: `${finalSync}%`,
        tasksDone: tasksDone.toString(),
        earned: earned.toLocaleString(),
        rank: `#${rank}`,
      },
      user: { username: (userData as any)?.username || 'HUNTER' },
      // 4. Mapping Log: Cek message, title, atau text
      logs: notifications.map((n: any) => ({
        msg: n.message || n.title || n.text || "Neural System Update",
        time: formatRelativeTime(n.createdAt),
        status: n.type || 'info'
      }))
    })

  } catch (err: any) {
    console.error("Stats API Error:", err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

function formatRelativeTime(date: any): string {
  if (!date) return 'now'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'now'
  
  const diff = Math.floor((new Date().getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}