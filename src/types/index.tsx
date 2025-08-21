// types/index.ts
export interface Campaign {
  _id?: string                // ← optional biar kompatibel dgn data Mongo
  id?: number                 // ← tetap ada utk dummy/local, dibuat optional
  title: string
  description: string
  reward: string
  budget?: string             // optional, default bisa "0"
  status: 'active' | 'finished' | 'rejected'
  links?: { url: string; label: string }[]
  owner?: string
  contributors?: number       // ← optional biar kompatibel dengan Dashboard
}
