import mongoose, { Schema, Document } from "mongoose"

export interface ISocialAccount extends Document {
  userId: string // World ID / hunter ID
  provider: "twitter" | "twitter_temp"
  socialId?: string // twitter user id (final setelah connect)
  username?: string
  profileUrl?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date

  // Field tambahan untuk OAuth PKCE (digunakan di twitter_temp)
  state?: string
  codeVerifier?: string
  createdAt?: Date
}

const socialAccountSchema = new Schema<ISocialAccount>(
  {
    userId: { type: String, required: true, index: true },
    provider: {
      type: String,
      enum: ["twitter", "twitter_temp"],
      required: true,
    },
    socialId: { type: String },
    username: { type: String },
    profileUrl: { type: String },
    accessToken: { type: String },
    refreshToken: { type: String },
    expiresAt: { type: Date },

    // Field baru untuk scope
    scope: { type: [String], default: [] }, // ✅ simpan scopes sebagai array string
    
    // Untuk record sementara (PKCE)
    state: { type: String },
    codeVerifier: { type: String },
    createdAt: { type: Date },
  },
  { timestamps: true }
)

// Hindari recompile error di Next.js (hot-reload)
export default mongoose.models.SocialAccount ||
  mongoose.model<ISocialAccount>("SocialAccount", socialAccountSchema)
