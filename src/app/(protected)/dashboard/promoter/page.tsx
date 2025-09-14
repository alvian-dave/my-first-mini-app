'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'
import { CampaignForm } from '@/components/CampaignForm'
import { CampaignTabs } from '@/components/CampaignTabs'
import TopupModal from '@/components/TopupModal'
import type { Campaign as BaseCampaign, Task } from '@/types'

// ✅ Type untuk campaign yang dipakai di UI
type UICampaign = BaseCampaign & {
  _id: string
  contributors: number
  createdBy?: string
  participants?: string[]
  tasks?: Task[]
}

export default function PromoterDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<UICampaign[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'finished' | 'rejected'>('active')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<UICampaign | null>(null)
  const [balance, setBalance] = useState(0)
  const [showChat, setShowChat] = useState(false)
  const [showTopup, setShowTopup] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [participants, setParticipants] = useState<string[]>([])

  // redirect jika belum login
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/home')
  }, [status, router])

  // ambil balance user
  useEffect(() => {
    if (!session?.user) return
    const fetchBalance = async () => {
      try {
        const res = await fetch(`/api/balance/${session.user.id}`)
        const data = await res.json()
        if (data.success) setBalance(data.balance.amount)
      } catch (err) {
        console.error('Failed to fetch balance:', err)
      }
    }
    fetchBalance()
  }, [session])

  // ambil campaign yang dibuat oleh user ini
  useEffect(() => {
    if (!session?.user) return
    const loadCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns')
        const data = await res.json()
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

  // 🟢 create / update campaign
  const handleSubmit = async (campaign: BaseCampaign) => {
    if (campaign.tasks && campaign.tasks.length > 3) {
      alert('Max 3 tasks allowed per campaign!')
      return
    }

    try {
      if (editingCampaign) {
        await fetch(`/api/campaigns/${editingCampaign._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaign),
        })
      } else {
        await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaign),
        })
      }

      // reload campaign list
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      const filtered = (data as UICampaign[]).filter(c => c.createdBy === session.user.id)
      setCampaigns(filtered)

      setIsModalOpen(false)
      setEditingCampaign(null)
    } catch (err) {
      console.error('Failed to submit campaign:', err)
    }
  }

  // mark finished
  const handleMarkFinished = async (id: string) => {
    try {
      await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'finished' }),
      })
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
        {/* Balance */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-medium">
            Balance{" "}
            <span className="text-green-400 font-bold">{balance.toFixed(2)} WR</span>
          </div>
          <button
            onClick={() => setShowTopup(true)}
            className="px-4 py-1 rounded font-medium bg-blue-600 text-white"
          >
            Topup
          </button>
        </div>

        {/* Create campaign */}
        <div className="text-center mb-6">
          <button
            onClick={() => {
              setEditingCampaign(null)
              setIsModalOpen(true)
            }}
            className="px-6 py-2 rounded font-semibold shadow bg-green-600 text-white"
          >
            + Create Campaign
          </button>
        </div>

        {/* Tabs */}
        <div className="sticky top-18 bg-gray-900 z-40 pb-3">
          <CampaignTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Campaign list */}
        {current.length === 0 ? (
          <p className="text-center text-gray-400">No campaigns in this tab.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {current.map(c => (
              <div key={c._id} className="bg-gray-800 p-5 rounded shadow">
                <h3 className="text-lg font-bold">{c.title}</h3>

                {/* Task list */}
                {c.tasks && c.tasks.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {c.tasks.map((t, i) => (
                      <li key={i} className="text-sm text-gray-300">
                        ✅ [{t.service ? t.service.toUpperCase() : 'TASK'}] {t.type.toUpperCase()} → {t.url}
                      </li>
                    ))}
                  </ul>
                )}

                <p className="text-gray-300 my-2">{c.description}</p>
                <p className="text-sm text-green-400 font-semibold">Reward: {c.reward}</p>
                <p className="text-sm text-yellow-400 font-semibold">Budget: {c.budget}</p>

                <div className="flex gap-2 mt-3">
                  {c.status !== 'finished' && (
                    <>
                      <button
                        onClick={() => {
                          setEditingCampaign(c)
                          setIsModalOpen(true)
                        }}
                        className="px-3 py-1 rounded font-medium bg-yellow-400 text-black"
                      >
                        Edit
                      </button>
                      {c.contributors > 0 ? (
                        <button
                          onClick={() => handleMarkFinished(c._id)}
                          className="px-3 py-1 rounded font-medium bg-blue-600 text-white"
                        >
                          Mark Finished
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(c._id)}
                          className="px-3 py-1 rounded font-medium bg-red-600 text-white"
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Campaign form modal */}
        <CampaignForm
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingCampaign(null)
          }}
          onSubmit={handleSubmit}
          editingCampaign={editingCampaign}
        />

        {/* Participants modal */}
        {showParticipants && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-96 max-h-[70vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">Participants</h2>
              {participants.length === 0 ? (
                <p className="text-gray-400">No participants yet.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  {participants.map((p) => (
                    <li key={p} className="text-sm text-gray-200">{p}</li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowParticipants(false)}
                  className="px-4 py-2 rounded bg-green-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Topup modal */}
      {showTopup && session?.user?.id && (
        <TopupModal
          userId={session.user.id}
          onClose={() => setShowTopup(false)}
          onSuccess={(newBalance) => setBalance(newBalance)}
        />
      )}

      {/* Chat widget */}
      <div className="fixed bottom-4 left-4 z-50">
        {!showChat ? (
          <button
            className="p-3 rounded-full shadow bg-green-600 text-white"
            onClick={() => setShowChat(true)}
          >
            💬
          </button>
        ) : (
          <div className="w-80 h-96 bg-white text-black rounded-xl shadow-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-4 py-2 bg-green-600 text-white">
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
