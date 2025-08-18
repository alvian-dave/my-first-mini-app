// types/index.ts
export interface Campaign {
  id: number
  title: string
  description: string
  reward: string
  budget?: string   // 👈 jadikan optional
  status: 'active' | 'finished' | 'rejected'
  links?: { url: string; label: string }[]
  owner?: string
}
