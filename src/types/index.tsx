// types/index.ts
export interface Campaign {
  id: number
  title: string
  description: string
  reward: string
  budget: string   // 👈 tambahkan ini
  status: 'active' | 'finished' | 'rejected'
  links?: { url: string; label: string }[]
  owner?: string
}
