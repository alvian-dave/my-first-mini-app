// src/models/Topup.ts
import mongoose, { Schema, models } from 'mongoose'

const TopupSchema = new Schema(
  {
    userAddress: { type: String, required: true, index: true },
    depositTxHash: { type: String, required: true, unique: true },
    amountUSDC: { type: Number, required: true },
    amountWR: { type: String, required: true }, // store human-readable WR (may be decimal string)
    mintTxHash: { type: String },
    status: { type: String, enum: ['pending', 'minted', 'failed'], default: 'pending' },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

const Topup = models.Topup || mongoose.model('Topup', TopupSchema)
export default Topup
