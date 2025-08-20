import mongoose, { Schema, models } from 'mongoose'

const CampaignSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    reward: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'finished', 'rejected'],
      default: 'active',
    },
    links: [{ url: String, label: String }],
    createdBy: { type: String, required: true }, // userId promoter
    contributors: { type: Number, default: 0 },  // jumlah hunter yg submit
  },
  { timestamps: true }
)

export const Campaign =
  models.Campaign || mongoose.model('Campaign', CampaignSchema)
