// models/LeaderboardCache.ts
import mongoose from 'mongoose'

const LeaderboardCacheSchema = new mongoose.Schema({
  timeframe: { type: String, enum: ['all-time', 'weekly'], unique: true },
  data: Array,
  updatedAt: { type: Date, default: Date.now }
})

export const LeaderboardCache = mongoose.models.LeaderboardCache || mongoose.model('LeaderboardCache', LeaderboardCacheSchema)