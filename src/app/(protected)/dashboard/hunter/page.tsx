'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'
import TaskModal from '@/components/TaskModal'

interface Task {
  service: string
  type: string
  url: string
  done?: boolean
}

interface TaskProgress extends Task {
  done: boolean
}

interface Submission {
  status: string
  tasks: Task[]
}

interface Campaign {
  _id: string
  title: string
  description: string
  reward: string
  status: 'active' | 'finished' | 'rejected'
  tasks?: Task[]
  participants?: string[]
}

export default function HunterDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [completedCampaigns, setCompletedCampaigns] = useState<Campaign[]>([])
  const [dbBalance, setDbBalance] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rejected'>('active')
  const [showChat, setShowChat] = useState(false)
  const [loadingIds, setLoadingIds] = useState<string[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/')
  }, [status, router])

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns', { cache: 'no-store' })
        if (res.ok) {
          setCampaigns(await res.json())
        }
      } catch (err) {
        console.error('Failed to load campaigns', err)
      }
    }
    loadCampaigns()
  }, [])

  // Load completed
  useEffect(() => {
    const loadCompleted = async () => {
      if (!session?.user?.id) return
      try {
        const res = await fetch('/api/campaigns/completed', { cache: 'no-store' })
        if (res.ok) {
          setCompletedCampaigns(await res.json())
        }
      } catch (err) {
        console.error('Failed to load completed campaigns', err)
      }
    }
    loadCompleted()
  }, [session])

  // Load balance
  const fetchBalance = async () => {
    if (!session?.user?.id) return
    try {
      const res = await fetch(`/api/balance/${session.user.id}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (data.success) setDbBalance(data.balance.amount ?? 0)
    } catch (err) {
      console.error('Failed to fetch hunter balance', err)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [session])

  // filter campaigns sesuai tab
  const filtered = (() => {
    if (activeTab === 'active') {
      const completedIds = new Set(completedCampaigns.map((c) => c._id))
      return campaigns.filter((c) => c.status === 'active' && !completedIds.has(c._id))
    }
    if (activeTab === 'completed') return completedCampaigns
    if (activeTab === 'rejected') return campaigns.filter((c) => c.status === 'rejected')
    return []
  })().sort((a, b) => (a._id > b._id ? -1 : 1))

  // helper loading
  const setLoadingFor = (id: string, loading: boolean) => {
    setLoadingIds((prev) => (loading ? [...prev, id] : prev.filter((x) => x !== id)))
  }
  const isLoading = (id: string) => loadingIds.includes(id)

  // --- submit task (legacy) ---
  const submitSubmission = async (campaignId: string, tasks?: TaskProgress[]) => {
    if (!campaignId) return
    try {
      setLoadingFor(campaignId, true)
      const res = await fetch(`/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          tasks,
        }),
      })

      if (!res.ok) {
        let errMsg = 'Failed to submit task. Please try again.'
        try {
          const errBody = await res.json()
          if (errBody?.error) errMsg = errBody.error
        } catch {}
        alert(errMsg)
        return
      }

      const data = await res.json()

      if (data.newBalance !== undefined) {
        setDbBalance(data.newBalance)
      }

      // refresh campaigns & completed
      const [completedRes, campaignsRes] = await Promise.all([
        fetch('/api/campaigns/completed', { cache: 'no-store' }),
        fetch('/api/campaigns', { cache: 'no-store' }),
      ])

      if (completedRes.ok) setCompletedCampaigns(await completedRes.json())
      if (campaignsRes.ok) setCampaigns(await campaignsRes.json())

      setSelectedCampaign(null)
      setActiveTab('completed')
    } catch (err) {
      console.error('Submit task failed', err)
    } finally {
      setLoadingFor(campaignId, false)
    }
  }

  if (status === 'loading') return <div className="text-white p-6">Loading...</div>
  if (!session?.user) return null

  return (
    <div className="min-h-screen bg-gray-900 text-white w-full">
      <Topbar />

      <div className="w-full px-6 py-8">
        {/* Tabs */}
        <div className="sticky top-16 z-40 bg-gray-900 flex justify-center gap-4 py-3">
          {['active', 'completed', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className="px-5 py-2 rounded-full font-semibold text-white"
              style={{ backgroundColor: activeTab === tab ? '#16a34a' : '#374151' }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Balance */}
        <div className="text-center mb-6">
          <p className="text-gray-300">
            Your Balance: <span className="text-green-400 font-bold">{dbBalance} WR</span>
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
                  {activeTab === 'completed' && (
                    <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded">
                      Submitted
                    </span>
                  )}
                </div>

                <p className="text-gray-300 mb-2">{c.description}</p>

                <p className="text-sm text-gray-400 mb-2">
                  Reward: <span className="text-green-400 font-semibold">{c.reward}</span>
                </p>

                {/* 🔥 update bagian Active */}
                {activeTab === 'active' ? (
                  <div className="mt-3">
                    <p className="text-yellow-400 font-medium mb-2">Task In Progress</p>
                    {c.tasks && c.tasks.length > 0 && (
                      <ul className="text-sm text-gray-300 space-y-1">
                        {c.tasks.map((t, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="bg-gray-700 px-2 py-0.5 rounded text-xs text-yellow-400">
                              {t.service}
                            </span>
                            <span className="text-gray-200">{t.type}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      className="mt-3 w-full py-2 rounded font-semibold text-white"
                      style={{ backgroundColor: '#16a34a' }}
                      onClick={() => setSelectedCampaign(c)}
                    >
                      {isLoading(c._id) ? 'Submitting...' : 'Submit Task'}
                    </button>
                  </div>
                ) : activeTab === 'completed' ? (
                  <div className="mt-3">
                    <p className="text-green-400 font-medium mb-2">
                      Task Submitted — Status:{' '}
                      <span
                        className={
                          c.status === 'finished' ? 'text-blue-400' : 'text-green-400'
                        }
                      >
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </p>
                    {c.tasks && c.tasks.length > 0 && (
                      <ul className="text-sm text-gray-300 space-y-1">
                        {c.tasks.map((t, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="bg-gray-700 px-2 py-0.5 rounded text-xs text-green-400">
                              {t.service}
                            </span>
                            <span className="text-gray-200">{t.type}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Task */}
      {selectedCampaign && (
        <TaskModal
          campaignId={selectedCampaign._id}
          title={selectedCampaign.title}
          description={selectedCampaign.description}
          tasks={selectedCampaign.tasks || []}
          onClose={() => setSelectedCampaign(null)}
          onConfirm={async (submission: Submission) => {
            try {
              const [completedRes, campaignsRes, balanceRes] = await Promise.all([
                fetch('/api/campaigns/completed', { cache: 'no-store' }),
                fetch('/api/campaigns', { cache: 'no-store' }),
                fetch(`/api/balance/${session?.user?.id}`, { cache: 'no-store' }),
              ])

              if (completedRes.ok) {
                setCompletedCampaigns(await completedRes.json())
              }
              if (campaignsRes.ok) {
                setCampaigns(await campaignsRes.json())
              }
              if (balanceRes.ok) {
                const bal = await balanceRes.json()
                if (bal?.success) setDbBalance(bal.balance.amount ?? dbBalance)
              }

              setSelectedCampaign(null)
              setActiveTab('completed')
            } catch (err) {
              console.error('Failed to refresh after submission', err)
              setSelectedCampaign(null)
            }
          }}
        />
      )}

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
