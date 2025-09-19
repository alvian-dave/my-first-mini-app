import mongoose, { Schema, Document } from "mongoose"

export interface ISocialAccount extends Document {
  userId: string // World ID / hunter ID
  provider: "twitter"
  socialId: string // twitter user id
  username?: string
  profileUrl?: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}

const socialAccountSchema = new Schema<ISocialAccount>(
  {
    userId: { type: String, required: true, index: true },
    provider: { type: String, enum: ["twitter"], required: true },
    socialId: { type: String, required: true },
    username: { type: String },
    profileUrl: { type: String },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.models.SocialAccount ||
  mongoose.model<ISocialAccount>("SocialAccount", socialAccountSchema)
