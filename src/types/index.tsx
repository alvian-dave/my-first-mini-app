// types/index.ts
export interface Campaign {
  id: number
  title: string
  description: string
  reward: string
  budget?: string   // optional, default bisa "0"
  status: 'active' | 'finished' | 'rejected'
  links?: { url: string; label: string }[]
  owner?: string
}
