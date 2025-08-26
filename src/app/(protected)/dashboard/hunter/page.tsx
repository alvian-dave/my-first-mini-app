'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'

interface Campaign {
  _id: string
  title: string
  description: string
  reward: string
  status: 'active' | 'finished' | 'rejected'
  links?: { url: string; label: string }[]
  contributors?: number
}

interface Submission {
  _id: string
  campaignId: string
  userId: string
  status: 'submitted' | 'approved' | 'rejected'
  createdAt: string
}

export default function HunterDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [hunterBalance, setHunterBalance] = useState(0)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rejected'>('active')
  const [showChat, setShowChat] = useState(false)
  const [loadingIds, setLoadingIds] = useState<string[]>([]) // track which campaign is submitting

  // Redirect kalau belum login
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/')
  }, [status, router])

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns', { cache: 'no-store' })
        if (!res.ok) {
          console.error('Failed to fetch campaigns', await res.text())
          return
        }
        const data = await res.json()
        setCampaigns(data)
      } catch (err) {
        console.error('Failed to load campaigns', err)
      }
    }
    loadCampaigns()
  }, [])

  // Load hunter balance dari API
  useEffect(() => {
    const loadBalance = async () => {
      try {
        const res = await fetch('/api/balance', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setHunterBalance(data.balance || 0)
      } catch (err) {
        console.error('Failed to load balance', err)
      }
    }
    if (session?.user) loadBalance()
  }, [session?.user])

  // Load submissions hunter dari API
  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        const res = await fetch('/api/submissions', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setSubmissions(data)
      } catch (err) {
        console.error('Failed to load submissions', err)
      }
    }
    if (session?.user) loadSubmissions()
  }, [session?.user])

  if (status === 'loading') return <div className="text-white p-6">Loading...</div>
  if (!session?.user) return null

  // Helper untuk cek sudah submit campaign
  const hasSubmitted = (campaignId: string) =>
    submissions.some((s) => s.campaignId === campaignId)

  // Filter logic
  const filtered = campaigns
    .filter((c) => {
      if (activeTab === 'active') {
        return c.status === 'active' && !hasSubmitted(c._id)
      }
      if (activeTab === 'completed') {
        return hasSubmitted(c._id) || c.status === 'finished'
      }
      if (activeTab === 'rejected') {
        return c.status === 'rejected'
      }
      return false
    })
    .sort((a, b) => (a._id > b._id ? -1 : 1))

  // Loading marker
  const setLoadingFor = (id: string, loading: boolean) => {
    setLoadingIds(prev => (loading ? [...prev, id] : prev.filter(x => x !== id)))
  }
  const isLoading = (id: string) => loadingIds.includes(id)

  // Submit task: POST /api/submissions
  const handleSubmitTask = async (campaignId: string, reward: string) => {
    if (hasSubmitted(campaignId)) return

    try {
      setLoadingFor(campaignId, true)

      const res = await fetch(`/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('Submit task failed', res.status, text)
        alert('Gagal submit task. Coba lagi.')
        return
      }

      const data = await res.json()
      const { updatedCampaign, newSubmission, newBalance } = data

      // Update campaigns
      setCampaigns(prev =>
        prev.map(c => (c._id === campaignId ? updatedCampaign : c))
      )

      // Update submissions
      setSubmissions(prev => [...prev, newSubmission])

      // Update balance
      setHunterBalance(newBalance || 0)
    } catch (err) {
      console.error('Failed to submit task', err)
      alert('Gagal submit task. Coba lagi.')
    } finally {
      setLoadingFor(campaignId, false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white w-full">
      <Topbar />

      <div className="w-full px-6 py-8">
        <div
          className="text-center font-semibold text-white rounded-lg py-3 mb-6 shadow-lg"
          style={{ background: 'linear-gradient(to right, #16a34a, #3b82f6)' }}
        >
          "Every task you complete brings you closer to greatness..."
        </div>

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
                  {hasSubmitted(c._id) && (
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

                {/* Links */}
                {c.links?.map((l, i) => (
                  <a
                    key={i}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline text-sm block mb-1 break-all"
                  >
                    {l.label}
                  </a>
                ))}

                {!hasSubmitted(c._id) ? (
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
