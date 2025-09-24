// types/index.ts

// ==========================
// User
// ==========================
export interface User {
  _id?: string
  walletAddress: string
  username?: string
  profilePictureUrl?: string
}

// ==========================
// Role
// ==========================
export interface Role {
  _id?: string
  userId: string
  roles: string[]              // contoh: ["hunter", "promoter"]
  activeRole: "hunter" | "promoter"
}

// ==========================
// Balance
// ==========================
export interface Balance {
  _id?: string
  userId: string
  role: "hunter" | "promoter"
  amount: number
}

// ==========================
// Task
// ==========================
export interface Task {
  service: "twitter" | "discord" | "telegram" | "" // "" default jika belum dipilih
  type: string // misalnya "follow" | "retweet" | "join_channel"
  url: string  // link target (profile, group, post, dll)
  targetId?: string
  tweetId?: string
}

// ==========================
// Campaign
// ==========================
export interface Campaign {
  _id?: string                 // dari Mongo
  id?: number                  // opsional utk dummy/local
  title: string
  description: string
  budget: string
  reward: string
  status: "active" | "finished" | "rejected"
  tasks: Task[]                // ✅ ganti links → tasks
  createdBy?: string           // userId promoter
  contributors?: number        // jumlah hunter yg submit
}

// ==========================
// SocialAccount
// ==========================
export interface SocialAccount {
  _id?: string                // dari Mongo
  userId: string              // ID user di WorldApp

  // Bisa record final (twitter) atau sementara (twitter_temp)
  provider: "twitter" | "twitter_temp"

  // Field final (kalau sudah connect)
  accessToken?: string
  refreshToken?: string
  expiresAt?: string          // ISO string dari Date
  socialId?: string           // misal twitter user id
  username?: string
  profileUrl?: string

  // Field sementara (PKCE, dipakai di twitter_temp)
  state?: string
  codeVerifier?: string

  // Field tambahan
  scope?: string[] // array of scopes

  createdAt?: string
  updatedAt?: string
}

// ==========================
// Submission
// ==========================
export interface SubmissionTask {
  service: "twitter" | "discord" | "telegram"
  type: string
  url: string
  done: boolean
  verifiedAt?: string
}

export interface Submission {
  _id?: string
  userId: string
  campaignId: string
  tasks: SubmissionTask[]
  status: "pending" | "submitted"
  rewarded?: boolean           // ✅ sinkron dengan schema
  createdAt?: string
  updatedAt?: string
}