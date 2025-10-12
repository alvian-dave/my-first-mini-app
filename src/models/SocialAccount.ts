import mongoose, { Schema, Document } from "mongoose"

export interface ISocialAccount extends Document {
  userId: string // World ID / hunter ID
  provider: "twitter" | "twitter_temp" | "discord" | "discord_temp" | "telegram"
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
      enum: ["twitter", "twitter_temp", "discord", "discord_temp", "telegram"],
      required: true,
    },

    socialId: { type: String },
    username: { type: String },
    profileUrl: { type: String },

    accessToken: { type: String },
    refreshToken: { type: String },
    expiresAt: { type: Date },

    scope: { type: [String], default: [] },

    state: { type: String },
    codeVerifier: { type: String },
    createdAt: { type: Date },
  },
  { timestamps: true }
)

// ✅ Pastikan setiap user hanya punya 1 akun per provider
socialAccountSchema.index({ userId: 1, provider: 1 }, { unique: true })

// ✅ Hindari recompile error di Next.js (Hot Reload)
const SocialAccount =
  mongoose.models.SocialAccount ||
  mongoose.model<ISocialAccount>("SocialAccount", socialAccountSchema)

export default SocialAccount
