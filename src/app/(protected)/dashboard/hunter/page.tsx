'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'
import TaskModal from '@/components/TaskModal'
import Toast from '@/components/Toast'
import { getWRCreditBalance } from '@/lib/getWRCreditBalance'

interface Task {
  service: string
  type: string
  url: string
  done?: boolean
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
  contributors?: number
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(
    null
  )

  // 🔐 Redirect jika belum login
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/')
  }, [status, router])

  // =========================
  // FETCH DATA
  // =========================
  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data)
      }
    } catch (err) {
      console.error('Failed to load campaigns', err)
      setToast({ message: 'Failed to load campaigns', type: 'error' })
    }
  }

  const fetchCompleted = async () => {
    if (!session?.user?.id) return
    try {
      const res = await fetch('/api/campaigns/completed', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setCompletedCampaigns(data)
      }
    } catch (err) {
      console.error('Failed to load completed campaigns', err)
      setToast({ message: 'Failed to load completed campaigns', type: 'error' })
    }
  }

  const fetchBalance = async () => {
    if (!session?.user?.walletAddress) return
    try {
      const balance = await getWRCreditBalance(session.user.walletAddress)
      setDbBalance(balance)
    } catch (err) {
      console.error('Failed to fetch blockchain balance:', err)
      setToast({ message: 'Failed to fetch WR from blockchain', type: 'error' })
    }
  }

  useEffect(() => {
    fetchCampaigns()
    fetchCompleted()
    fetchBalance()
  }, [session?.user?.id])

  // =========================
  // STATE HELPERS
  // =========================
  const setLoadingFor = (id: string, loading: boolean) => {
    setLoadingIds((prev) => (loading ? [...prev, id] : prev.filter((x) => x !== id)))
  }
  const isLoading = (id: string) => loadingIds.includes(id)

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  // =========================
  // FILTER & SORT
  // =========================
  const filtered = (() => {
    if (activeTab === 'active') {
      const completedIds = new Set(completedCampaigns.map((c) => c._id))
      return campaigns.filter((c) => c.status === 'active' && !completedIds.has(c._id))
    }
    if (activeTab === 'completed') return completedCampaigns
    if (activeTab === 'rejected') return campaigns.filter((c) => c.status === 'rejected')
    return []
  })().sort((a, b) => (a._id > b._id ? 1 : -1))

  // =========================
  // PAGINATION (AMAN)
  // =========================
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // reset ke halaman pertama saat ganti tab
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const indexOfLast = currentPage * itemsPerPage
  const indexOfFirst = indexOfLast - itemsPerPage
  const currentCampaigns = filtered.slice(indexOfFirst, indexOfLast)

  // =========================
  // GUARD SESSION
  // =========================
  if (status === 'loading') return <div className="text-white p-6">Loading...</div>
  if (!session?.user) return null

  return (
    <div className="min-h-screen bg-gray-900 text-white w-full">
      <Topbar />

      <div className="w-full px-6 py-8">
        {/* Banner */}
        <div
          className="text-center font-semibold text-white rounded-lg py-3 mb-6 shadow-lg"
          style={{ background: 'linear-gradient(to right, #16a34a, #3b82f6)' }}
        >
          "Every task you complete brings you closer to greatness..."
        </div>

        {/* Tabs */}
        <div className="sticky top-16 z-40 bg-gray-900 flex justify-center gap-4 py-3">
          {['active', 'completed', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className="px-6 py-2 rounded-full font-semibold text-white"
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
          {currentCampaigns.length === 0 ? (
            <p className="text-center text-gray-400 col-span-2">No tasks in this tab.</p>
          ) : (
            currentCampaigns.map((c) => {
              const isExpanded = expandedIds.has(c._id)
              const displayedDesc = isExpanded
                ? c.description
                : c.description.length > 100
                ? c.description.slice(0, 100) + '...'
                : c.description

              return (
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

                  {activeTab === 'active' && (
                    <>
                      <p className="text-gray-300 mb-2 whitespace-pre-line">
                        {displayedDesc}
                      </p>
                      {c.description.length > 100 && (
                        <button
                          onClick={() => toggleExpand(c._id)}
                          style={{
                            color: 'white',
                            backgroundColor: '#3b82f6',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            display: 'block',
                            marginTop: '4px',
                          }}
                        >
                          {isExpanded ? 'Show Less' : 'Read More'}
                        </button>
                      )}
                    </>
                  )}

                  <p className="text-sm text-gray-400 mb-2 mt-2">
                    Reward: <span className="text-green-400 font-semibold">{c.reward}</span>
                  </p>

                  {activeTab === 'active' ? (
                    <div className="mt-3">
                      <p className="text-yellow-400 font-medium mb-2">Task In Progress</p>
                      {c.tasks && c.tasks.length > 0 && (
                        <ul className="text-sm text-gray-300 space-y-1">
                          {c.tasks.map((t, i) => (
                            <li key={i} className="flex items-center gap-2 last:mb-3">
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
                        {isLoading(c._id) ? 'Loading...' : 'Submit Task'}
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
              )
            })
          )}
        </div>
      </div>

{/* ✅ PAGINATION BAR (Final + Force Colors) */}
{totalPages > 1 && (
  <div className="flex flex-col items-center gap-2 mb-4">
    {/* Baris tombol pagination */}
    <div className="flex justify-center items-center gap-2 flex-wrap">
      {/* Prev */}
      <button
        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
        disabled={currentPage === 1}
        style={{
          backgroundColor: currentPage === 1 ? '#374151' : '#facc15', // gray atau kuning
          color: currentPage === 1 ? '#9ca3af' : '#000', // teks abu-abu / hitam
          fontWeight: 'bold',
          padding: '4px 12px',
          borderRadius: '6px',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
        }}
      >
        Prev
      </button>

      {/* Page numbers */}
      {Array.from({ length: totalPages })
        .map((_, i) => i + 1)
        .filter((page) => {
          return (
            page === 1 ||
            page === totalPages ||
            (page >= currentPage - 2 && page <= currentPage + 2)
          )
        })
        .map((page, idx, arr) => {
          const prevPage = arr[idx - 1]
          const showEllipsis = prevPage && page - prevPage > 1

          return (
            <span key={page} className="flex items-center">
              {showEllipsis && (
                <span style={{ padding: '0 4px', color: '#9ca3af' }}>...</span>
              )}
              <button
                onClick={() => setCurrentPage(page)}
                style={{
                  backgroundColor: currentPage === page ? '#16a34a' : '#374151', // hijau / gray
                  color: currentPage === page ? '#fff' : '#d1d5db', // putih / abu-abu terang
                  fontWeight: currentPage === page ? 'bold' : 'normal',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {page}
              </button>
            </span>
          )
        })}

      {/* Next */}
      <button
        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
        disabled={currentPage === totalPages}
        style={{
          backgroundColor: currentPage === totalPages ? '#374151' : '#facc15', // gray / kuning
          color: currentPage === totalPages ? '#9ca3af' : '#000', // abu-abu / hitam
          fontWeight: 'bold',
          padding: '4px 12px',
          borderRadius: '6px',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
        }}
      >
        Next
      </button>
    </div>

    {/* Info bar di bawah */}
    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
      Page {currentPage} of {totalPages}
    </span>
  </div>
)}


      {/* Modal Task */}
      {selectedCampaign && (
        <TaskModal
          campaignId={selectedCampaign._id}
          title={selectedCampaign.title}
          description={selectedCampaign.description}
          tasks={selectedCampaign.tasks || []}
          session={session}
          onClose={() => setSelectedCampaign(null)}
          onConfirm={async (submission: Submission) => {
            try {
              await Promise.all([fetchCompleted(), fetchCampaigns(), fetchBalance()])
              setSelectedCampaign(null)
              setActiveTab('completed')
              setToast({ message: 'Task submitted successfully', type: 'success' })
            } catch (err) {
              console.error('Failed to refresh after submission', err)
              setSelectedCampaign(null)
              setToast({ message: 'Failed to submit task', type: 'error' })
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

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
