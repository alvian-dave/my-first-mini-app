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
// Submission
// ==========================
export interface Submission {
  _id?: string
  userId: string
  campaignId: string
  status: "submitted" | "approved" | "rejected"
  createdAt?: string
  updatedAt?: string
}
