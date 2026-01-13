import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Submission from '@/models/Submission'
import { LeaderboardCache } from '@/models/LeaderboardCache'

async function getLeaderboardData(timeframe: 'all-time' | 'weekly') {
  await dbConnect()

  const matchStage: any = { rewarded: true }
  
  if (timeframe === 'weekly') {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    matchStage.updatedAt = { $gte: sevenDaysAgo }
  }

  return await Submission.aggregate([
    // 1. Filter hanya yang sudah diberi reward
    { $match: matchStage },

    // 2. Kelompokkan berdasarkan userId dan hitung total missions + points
    {
      $group: {
        _id: "$userId",
        missionsDone: { $sum: 1 },
        totalReward: { $sum: { $toDouble: { $ifNull: ["$rewardAmount", "0"] } } }
      }
    },

    // 3. FIX: Konversi String ID ke ObjectId agar bisa di-join dengan collection users
    {
      $addFields: {
        userObjId: { 
          $convert: { 
            input: "$_id", 
            to: "objectId", 
            onError: null, 
            onNull: null 
          } 
        }
      }
    },

    // 4. Ambil data dari collection 'users'
    {
      $lookup: {
        from: "users",
        localField: "userObjId",
        foreignField: "_id",
        as: "userData"
      }
    },

    // 5. Bongkar array hasil lookup (unwind)
    { 
      $unwind: { 
        path: "$userData", 
        preserveNullAndEmptyArrays: true // Tetap munculkan rank meski user tak sengaja terhapus
      } 
    },

    // 6. Pilih field yang mau ditampilkan di UI
    {
      $project: {
        _id: 0,
        name: { 
          $ifNull: ["$userData.username", "$userData.walletAddress", "Unknown Hunter"] 
        },
        missions: "$missionsDone",
        points: "$totalReward"
      }
    },

    // 7. Urutkan dari poin tertinggi
    { $sort: { points: -1 } },

    // 8. Batasi top 50 biar ringan
    { $limit: 50 }
  ])
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') === 'weekly' ? 'weekly' : 'all-time'
    
    await dbConnect()

    // Ambil cache (casting 'any' agar TS tidak rewel soal property)
    const cached: any = await LeaderboardCache.findOne({ timeframe }).lean()
    
    const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 jam

    // Jika cache masih segar, langsung kirim
    if (cached && cached.updatedAt) {
      const isFresh = Date.now() - new Date(cached.updatedAt).getTime() < CACHE_DURATION
      if (isFresh && cached.data && cached.data.length > 0) {
        return NextResponse.json(cached.data)
      }
    }

    // Jika cache basi/kosong, hitung ulang
    const freshData = await getLeaderboardData(timeframe)
    
    // Simpan hasil hitungan ke cache
    await LeaderboardCache.findOneAndUpdate(
      { timeframe },
      { data: freshData, updatedAt: new Date() },
      { upsert: true, new: true }
    )

    return NextResponse.json(freshData)
  } catch (error: any) {
    console.error("Leaderboard API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}