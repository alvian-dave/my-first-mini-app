import mongoose, { Schema, models } from 'mongoose'

const CampaignSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    budget: { type: String, required: true }, // ✅ tambahkan budget
    reward: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'finished', 'rejected'],
      default: 'active',
    },
    links: [{ url: String, label: String }],
    createdBy: { type: String, required: true }, // userId promoter

    // ✅ jumlah hunter yg submit (counter)
    contributors: { type: Number, default: 0 },

    // ✅ daftar hunter yang sudah submit (buat tab Completed)
    participants: [{ type: String }], 
  },
  { timestamps: true }
)

export const Campaign =
  models.Campaign || mongoose.model('Campaign', CampaignSchema)
