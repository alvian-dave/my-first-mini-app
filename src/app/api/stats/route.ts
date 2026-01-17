import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Submission from '@/models/Submission'
import User from '@/models/User'
import { LeaderboardCache } from '@/models/LeaderboardCache'
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
      userObjId = userId as any;
    }

    // 1. Ambil data dasar secara parallel (Tanpa hitung rank manual yang berat)
    const [userData, statsData, totalUsers, notifications, cache] = await Promise.all([
      User.findById(userId).select('username').lean(),
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
      mongoose.connection.collection('notifications')
        .find({ 
          $and: [
            { $or: [{ userId: userIdString }, { userId: userObjId }] },
            { role: "hunter" }
          ]
        })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray(),
      LeaderboardCache.findOne({ timeframe: 'all-time' }).lean()
    ])

    const stats = (statsData as any)[0] || { totalEarned: 0, count: 0 }
    const earned = stats.totalEarned || 0
    const tasksDone = stats.count || 0

    // --- LOGIKA RANK LIGHTWEIGHT ---
    let rankDisplay = "50+";
    let rankNumeric = 51; // Default untuk hitungan neural sync
    
    const cachedData = (cache as any)?.data || [];
    const currentUsername = (userData as any)?.username;

    // Cari di cache (Top 50)
    const cacheIndex = cachedData.findIndex((item: any) => item.name === currentUsername);

    if (cacheIndex !== -1) {
      const actualRank = cacheIndex + 1;
      rankDisplay = `#${actualRank}`;
      rankNumeric = actualRank;
    } else {
      // User tidak ada di Top 50, kita gunakan "50+"
      rankDisplay = "50+";
      rankNumeric = 51; 
    }
    // --- SELESAI LOGIKA RANK ---

    // Neural Sync Persentase (Gunakan rankNumeric agar tetap ada visual progres)
    const neuralSyncPercent = totalUsers > 0 ? (1 - (rankNumeric / totalUsers)) * 100 : 0
    const finalSync = Math.max(0.1, neuralSyncPercent).toFixed(1)

    return NextResponse.json({
      ok: true,
      stats: {
        neuralSync: `${finalSync}%`,
        tasksDone: tasksDone.toString(),
        earned: earned.toLocaleString(),
        rank: rankDisplay, // Mengirimkan "50+" atau "#1-50"
      },
      user: { username: currentUsername || 'HUNTER' },
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