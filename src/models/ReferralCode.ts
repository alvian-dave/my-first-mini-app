// models/ReferralCode.ts
import mongoose, { Schema, Document, model, models } from 'mongoose'

export interface IReferralCode extends Document {
  userId: string              // ID user pemilik kode
  code: string                // contoh: WR-A9F2Q
  isActive: boolean
  createdAt: Date
}

const ReferralCodeSchema = new Schema<IReferralCode>(
  {
    userId: {
      type: String,
      required: true,
      unique: true, // 1 user = 1 kode
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true, // kode harus unik
      index: true,
      uppercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// Prevent overwrite model saat hot reload
const ReferralCode =
  models.ReferralCode || model<IReferralCode>('ReferralCode', ReferralCodeSchema)

export default ReferralCode
