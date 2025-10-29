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
  isOld?: boolean
}

// ==========================
// Campaign Types
// ==========================
export interface Task {
  service: "twitter" | "discord" | "telegram"
  type:
    | "follow"
    | "retweet"
    | "like"
    | "join"
    | "comment"
    | "join_channel"
    | "join_group"
    | "comment_group"
  url: string
  targetId?: string
  tweetId?: string
}

export interface Campaign {
  _id?: string // dari MongoDB
  id?: number  // opsional untuk dummy/local

  title: string
  description: string
  budget: string           // total WR budget (bisa string/number)
  reward: string           // reward per task (WR)
  status: "active" | "finished" | "rejected"
  tasks: Task[]            // daftar task campaign

  createdBy?: string       // userId promoter
  promoterAddress?: string // wallet address promoter

  contributors?: number    // total hunter submit
  participants?: string[]  // userId hunter yang sudah selesai

  // ====== On-chain tracking ======
  depositTxHash?: string   // hash Worldcoin transaction ID
  onchainHash?: string     // hash transaksi on-chain
  depositedWR?: string     // jumlah WR yang dikirim (wei)
  remainingWR?: string     // saldo WR tersisa (wei)
  lastRescueTx?: string    // hash rescue terakhir (reward/refund)
  error?: string           // catatan error jika gagal
}

// ==========================
// SocialAccount
// ==========================
export interface SocialAccount {
  _id?: string                // dari Mongo
  userId: string              // ID user di WorldApp

  // Bisa record final (twitter, discord, telegram)
  // atau sementara (twitter_temp, discord_temp)
  provider: "twitter" | "twitter_temp" | "discord" | "discord_temp" | "telegram"

  // Field final (kalau sudah connect)
  accessToken?: string
  refreshToken?: string
  expiresAt?: string          // ISO string dari Date
  socialId?: string           // misal twitter user id, discord user id, telegram chat id
  username?: string
  profileUrl?: string

  // Field sementara (PKCE, dipakai di *_temp)
  state?: string
  codeVerifier?: string

  // Field tambahan
  scope?: string[]            // array of scopes

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

// ==========================
// Topup
// ==========================
export interface Topup {
  _id?: string
  userAddress: string
  depositTxHash: string
  amountUSDC: number
  amountWR: string
  mintTxHash?: string
  status: 'pending' | 'minted' | 'failed'
  meta?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}
