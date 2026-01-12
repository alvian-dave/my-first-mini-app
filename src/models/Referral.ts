// models/Referral.ts
import mongoose, { Schema, Document, model, models } from 'mongoose'

export type ReferralStatus =
  | 'pending'
  | 'confirmed'
  | 'expired'
  | 'failed'

export interface IReferral extends Document {
  referrerUserId: string
  referrerWallet?: string

  refereeUserId: string
  refereeWallet?: string

  referralCode: string

  status: ReferralStatus

  rewardAmount: number

  txHashReferrer?: string
  txHashReferee?: string

  createdAt: Date
  updatedAt: Date
  confirmedAt?: Date
  expiredAt?: Date
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerUserId: {
      type: String,
      required: true,
      index: true,
    },
    referrerWallet: {
      type: String,
      required: false,
    },

    refereeUserId: {
      type: String,
      required: true,
      unique: true, // ❗ user hanya boleh pakai referral sekali
      index: true,
    },
    refereeWallet: {
      type: String,
      required: false,
    },

    referralCode: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'expired', 'failed'],
      default: 'pending',
      index: true,
    },

    rewardAmount: {
      type: Number,
      default: 5,
    },

    txHashReferrer: {
      type: String,
      required: false,
    },
    txHashReferee: {
      type: String,
      required: false,
    },

    confirmedAt: {
      type: Date,
      required: false,
    },
    expiredAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
)

// Prevent overwrite model saat hot reload
const Referral =
  models.Referral || model<IReferral>('Referral', ReferralSchema)

export default Referral
