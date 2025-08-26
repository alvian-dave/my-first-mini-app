'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'
import type { Campaign, Submission } from '@/types'

export default function HunterDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [hunterBalance, setHunterBalance] = useState(0)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rejected'>('active')
  const [showChat, setShowChat] = useState(false)
  const [loadingIds, setLoadingIds] = useState<string[]>([])

  // Redirect kalau belum login
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/')
  }, [status, router])

  // Load campaigns
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/campaign', { cache: 'no-store' })
        if (!res.ok) throw new Error(await res.text())
        setCampaigns(await res.json())
      } catch (err) {
        console.error('Failed to load campaigns', err)
      }
    }
    load()
  }, [])

  // Load hunter balance
  useEffect(() => {
    const loadBalance = async () => {
      if (!session?.user?.id) return
      try {
        const res = await fetch(`/api/balance/${session.user.id}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setHunterBalance(data.balance || 0)
      } catch (err) {
        console.error('Failed to load balance', err)
      }
    }
    loadBalance()
  }, [session?.user?.id])

  // Load submissions by hunter
  useEffect(() => {
    const loadSubs = async () => {
      if (!session?.user?.id) return
      try {
        const res = await fetch(`/api/submission?userId=${session.user.id}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(await res.text())
        setSubmissions(await res.json())
      } catch (err) {
        console.error('Failed to load submissions', err)
      }
    }
    loadSubs()
  }, [session?.user?.id])

  if (status === 'loading') return <div className="text-white p-6">Loading...</div>
  if (!session?.user) return null

  // Campaign IDs yang sudah disubmit hunter
  const submittedIds = submissions.map((s) => s.campaignId)

  const filtered = campaigns.filter((c) => {
    if (activeTab === 'active') {
      return c.status === 'active' && !submittedIds.includes(c._id)
    }
    if (activeTab === 'completed') {
      return submittedIds.includes(c._id) || c.status === 'finished'
    }
    if (activeTab === 'rejected') {
      return c.status === 'rejected'
    }
    return false
  })

  // Helper loading
  const setLoadingFor = (id: string, loading: boolean) => {
    setLoadingIds((prev) => (loading ? [...prev, id] : prev.filter((x) => x !== id)))
  }
  const isLoading = (id: string) => loadingIds.includes(id)

  // Submit task (simpan ke DB via /api/submission)
  const handleSubmitTask = async (campaignId: string, reward: string) => {
    if (submittedIds.includes(campaignId)) return
    try {
      setLoadingFor(campaignId, true)

      const res = await fetch(`/api/submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id,
          campaignId,
        }),
      })

      if (!res.ok) throw new Error(await res.text())
      const newSub: Submission = await res.json()

      setSubmissions((prev) => [...prev, newSub])
      setHunterBalance((prev) => prev + (parseFloat(reward) || 0))
    } catch (err) {
      console.error('Submit task failed', err)
      alert('Gagal submit task.')
    } finally {
      setLoadingFor(campaignId, false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white w-full">
      <Topbar />

      <div className="w-full px-6 py-8">
        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          {['active', 'completed', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className="px-5 py-2 rounded-full font-semibold text-white"
              style={{
                backgroundColor: activeTab === tab ? '#16a34a' : '#374151',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Balance */}
        <div className="text-center mb-6">
          <p className="text-gray-300">
            Your Balance: <span className="text-green-400 font-bold">{hunterBalance}</span>
          </p>
        </div>

        {/* Task Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 col-span-2">No tasks in this tab.</p>
          ) : (
            filtered.map((c) => (
              <div
                key={c._id}
                className="bg-gray-800 p-5 rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-green-400">{c.title}</h3>
                  {submittedIds.includes(c._id) && (
                    <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded">
                      Submitted
                    </span>
                  )}
                </div>

                <p className="text-gray-300 mb-2">{c.description}</p>
                <p className="text-sm text-gray-400 mb-2">
                  Reward:{' '}
                  <span className="text-green-400 font-semibold">{c.reward}</span>
                </p>

                {!submittedIds.includes(c._id) ? (
                  <button
                    className="mt-3 w-full py-2 rounded font-semibold text-white"
                    style={{ backgroundColor: '#16a34a' }}
                    onClick={() => handleSubmitTask(c._id, c.reward)}
                    disabled={isLoading(c._id)}
                  >
                    {isLoading(c._id) ? 'Submitting...' : 'Submit Task'}
                  </button>
                ) : (
                  <p className="text-green-400 mt-2 font-medium">
                    Task Submitted — Status:{' '}
                    <span
                      className={
                        c.status === 'finished' ? 'text-blue-400' : 'text-green-400'
                      }
                    >
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Chat */}
      <div className="fixed bottom-4 left-4 z-50">
        {!showChat ? (
          <div className="text-center">
            <button
              className="p-3 rounded-full shadow hover:scale-105 transition text-white"
              style={{ backgroundColor: '#16a34a' }}
              onClick={() => setShowChat(true)}
            >
              💬
            </button>
            <p className="text-xs text-gray-400 mt-1">Chat</p>
          </div>
        ) : (
          <div className="w-80 h-96 bg-white text-black rounded-xl shadow-lg overflow-hidden flex flex-col">
            <div
              className="flex justify-between items-center px-4 py-2 text-white"
              style={{ backgroundColor: '#16a34a' }}
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
