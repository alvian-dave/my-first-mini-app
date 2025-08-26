import mongoose, { Schema, Document, models } from "mongoose"

export interface IBalance extends Document {
  userId: string
  role: "hunter" | "promoter"
  amount: number
}

const BalanceSchema = new Schema<IBalance>(
  {
    userId: { type: String, required: true, unique: true },
    role: { type: String, enum: ["hunter", "promoter"], required: true },
    amount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

const Balance =
  models.Balance || mongoose.model<IBalance>("Balance", BalanceSchema)

export default Balance
