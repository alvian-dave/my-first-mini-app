import mongoose, { Schema, Document } from "mongoose"

export interface ISocialAccount extends Document {
  userId: string // World ID / hunter ID
  provider: "twitter" | "twitter_temp" | "discord" | "telegram"
  socialId?: string // ID dari platform (twitter user id, discord user id, telegram chat id, dll)
  username?: string // username dari platform
  profileUrl?: string // URL profil (optional, bisa kosong kalau platform gak kasih)
  accessToken?: string // token oauth
  refreshToken?: string // refresh token oauth (kalau ada)
  expiresAt?: Date // token expiry
  scope?: string[]

  // Field tambahan untuk OAuth PKCE (hanya dipakai di twitter_temp)
  state?: string
  codeVerifier?: string
  createdAt?: Date
}

const socialAccountSchema = new Schema<ISocialAccount>(
  {
    userId: { type: String, required: true, index: true },

    provider: {
      type: String,
      enum: ["twitter", "twitter_temp", "discord", "telegram"], // ✅ tambah provider lain
      required: true,
    },

    socialId: { type: String }, // ex: twitter.id, discord.id, telegram.id
    username: { type: String }, // ex: @username
    profileUrl: { type: String }, // ex: https://twitter.com/xxx

    accessToken: { type: String },
    refreshToken: { type: String },
    expiresAt: { type: Date },

    scope: { type: [String], default: [] }, // simpan scopes OAuth

    // khusus PKCE (twitter_temp)
    state: { type: String },
    codeVerifier: { type: String },
    createdAt: { type: Date },
  },
  { timestamps: true }
)

// Hindari recompile error di Next.js (hot reload)
export default mongoose.models.SocialAccount ||
  mongoose.model<ISocialAccount>("SocialAccount", socialAccountSchema)
