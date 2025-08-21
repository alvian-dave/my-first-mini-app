'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'
import { CampaignForm } from '@/components/CampaignForm'
import { CampaignTabs } from '@/components/CampaignTabs'
import type { Campaign as BaseCampaign } from '@/types'

// ⬇️ type untuk data yang datang dari API (punya _id & contributors)
type UICampaign = BaseCampaign & {
  _id: string
  contributors: number
  link?: string
  createdBy?: string
}

export default function PromoterDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<UICampaign[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'finished' | 'rejected'>('active')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<BaseCampaign | null>(null)
  const [balance, setBalance] = useState(0)
  const [showChat, setShowChat] = useState(false)

  // Redirect kalau belum login
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/home')
  }, [status, router])

  // Load campaign list dan filter berdasarkan user yang login
  useEffect(() => {
    if (!session?.user) return

    const loadCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns')
        const data = await res.json()
        // Filter hanya campaign milik user ini
        const filtered = (data as UICampaign[]).filter(c => c.createdBy === session.user.id)
        setCampaigns(filtered)
      } catch (err) {
        console.error('Failed to load campaigns:', err)
      }
    }

    loadCampaigns()
  }, [session])

  if (status === 'loading') return <div className="text-white p-6">Loading...</div>
  if (!session?.user) return null

  // ⬇️ onSubmit harus menerima BaseCampaign (sesuai CampaignForm Props)
  const handleSubmit = async (newCampaign: BaseCampaign) => {
    try {
      await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign),
      })
      // Reload campaigns setelah submit
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      const filtered = (data as UICampaign[]).filter(c => c.createdBy === session.user.id)
      setCampaigns(filtered)
      setIsModalOpen(false)
    } catch (err) {
      console.error('Failed to submit campaign:', err)
    }
  }

  const handleMarkFinished = async (id: string) => {
    try {
      await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'finished' }),
      })
      // Reload campaigns
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      const filtered = (data as UICampaign[]).filter(c => c.createdBy === session.user.id)
      setCampaigns(filtered)
    } catch (err) {
      console.error('Failed to mark finished:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return

    try {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      setCampaigns(prev => prev.filter(p => p._id !== id))
    } catch (err) {
      console.error('Failed to delete campaign:', err)
    }
  }

  const current = campaigns
    .filter(c => (c.status || 'active') === activeTab)
    .sort((a, b) => (a._id > b._id ? -1 : 1))

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Topbar />
      <main className="w-full px-4 md:px-12 py-6">
        {/* Balance + Topup */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-medium">
            Balance{' '}
            <span className="text-green-400 font-bold">{balance.toFixed(2)} WR</span>
          </div>
          <button
            onClick={() => alert('Topup coming soon!')}
            className="px-4 py-1 rounded font-medium"
            style={{ backgroundColor: '#2563eb', color: '#fff' }}
          >
            Topup
          </button>
        </div>

        {/* Create Campaign */}
        <div className="text-center mb-6">
          <button
            onClick={() => {
              setEditingCampaign(null)
              setIsModalOpen(true)
            }}
            className="px-6 py-2 rounded font-semibold shadow"
            style={{ backgroundColor: '#16a34a', color: '#fff' }}
          >
            + Create Campaign
          </button>
        </div>

        {/* Tabs */}
        <CampaignTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Campaign list */}
        {current.length === 0 ? (
          <p className="text-center text-gray-400">No campaigns in this tab.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {current.map(c => (
              <div
                key={c._id}
                className="bg-gray-800 p-5 rounded shadow hover:shadow-lg transition"
              >
                <h3 className="text-lg font-bold">
                  <a
                    href={`/campaigns/${c._id}`}
                    className="text-blue-400 hover:underline"
                  >
                    {c.title}
                  </a>
                </h3>

                {Array.isArray(c.links) && c.links.length > 0 && (
  <div className="mt-2 space-y-1">
    {c.links.map((l, i) => (
      <a
        key={i}
        href={l.url}
        target="_blank"
        rel="noopener noreferrer"
        className="!text-blue-500 underline hover:!text-blue-600 text-sm block break-all"
      >
        {l.label || l.url}
      </a>
    ))}
  </div>
)}

{!c.links?.length && c.link && (
  <p className="mt-2">
    <a
      href={c.link}
      target="_blank"
      rel="noopener noreferrer"
      className="!text-blue-500 underline hover:!text-blue-600 break-all"
    >
      {c.link}
    </a>
  </p>
)}

                <p className="text-gray-300 my-2 whitespace-pre-wrap">
                  {c.description}
                </p>
                <p className="text-sm text-green-400 font-semibold">
                  Reward: {c.reward}
                </p>
                <p className="text-sm text-gray-400">
                  Contributors: <b>{c.contributors ?? 0}</b>
                </p>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setEditingCampaign(c)
                      setIsModalOpen(true)
                    }}
                    className="px-3 py-1 rounded font-medium"
                    style={{ backgroundColor: '#facc15', color: '#000' }}
                  >
                    Edit
                  </button>
                  {c.contributors > 0 ? (
                    <button
                      onClick={() => handleMarkFinished(c._id)}
                      className="px-3 py-1 rounded font-medium"
                      style={{ backgroundColor: '#2563eb', color: '#fff' }}
                    >
                      Mark Finished
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="px-3 py-1 rounded font-medium"
                      style={{ backgroundColor: '#dc2626', color: '#fff' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal form */}
        <CampaignForm
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingCampaign(null)
          }}
          onSubmit={handleSubmit}
          editingCampaign={editingCampaign}
          setEditingCampaign={setEditingCampaign}
        />
      </main>

      {/* Floating Chat */}
      <div className="fixed bottom-4 left-4 z-50">
        {!showChat ? (
          <div className="text-center">
            <button
              className="p-3 rounded-full shadow hover:scale-105 transition"
              style={{ backgroundColor: '#16a34a', color: '#fff' }}
              onClick={() => setShowChat(true)}
            >
              💬
            </button>
            <p className="text-xs text-gray-400 mt-1">Chat</p>
          </div>
        ) : (
          <div className="w-80 h-96 bg-white text-black rounded-xl shadow-lg overflow-hidden flex flex-col">
            <div
              className="flex justify-between items-center px-4 py-2"
              style={{ backgroundColor: '#16a34a', color: '#fff' }}
            >
              <span className="font-semibold">Global Chat</span>
              <button onClick={() => setShowChat(false)}>✕</button>
            </div>
            <GlobalChatRoom />
          </div>
        )}
      </div>
    </div>
  )
}
