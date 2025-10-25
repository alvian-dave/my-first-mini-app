import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITopupReference extends Document {
  referenceId: string;
  userAddress: string;
  status: "pending" | "success" | "failed";
  isSent?: boolean;
  wrAmount: string;
  createdAt: Date;
}

const TopupReferenceSchema: Schema<ITopupReference> = new Schema({
  referenceId: { type: String, required: true, unique: true },
  userAddress: { type: String, required: true },
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" }, 
  isSent: { type: Boolean, default: false },
  wrAmount: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Cek apakah model sudah ada (Hot reload Next.js)
export const TopupReference: Model<ITopupReference> =
  mongoose.models.TopupReference || mongoose.model<ITopupReference>("TopupReference", TopupReferenceSchema);
