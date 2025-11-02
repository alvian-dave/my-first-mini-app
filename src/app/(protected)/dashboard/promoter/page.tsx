'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'
import { CampaignForm } from '@/components/CampaignForm'
import { CampaignTabs } from '@/components/CampaignTabs'
import USDCTransferModal from '@/components/USDCTransferModal'
import Toast from '@/components/Toast'
import type { Campaign as BaseCampaign } from '@/types'
import { getWRCreditBalance } from '@/lib/getWRCreditBalance'

// =======================
// Types
// =======================
type UICampaign = BaseCampaign & {
  _id: string
  contributors: number
  createdBy?: string
  participants?: string[]
  tasks?: { service: string; type: string; url: string }[]
}

type ToastState =
  | { message: string; type?: 'success' | 'error' }
  | { message: string; type: 'confirm'; onConfirm: () => void; onCancel?: () => void }

// =======================
// Component
// =======================
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
  const [toast, setToast] = useState<ToastState | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // Pagination + read more
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const [expandedIds, setExpandedIds] = useState<string[]>([])

  // =======================
  // Session guard
  // =======================
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/home')
  }, [status, router])

  // =======================
  // Fetch WR Balance
  // =======================
  useEffect(() => {
    if (!session?.user?.walletAddress) return
    const fetchOnChainBalance = async () => {
      try {
        const onChainBal = await getWRCreditBalance(session.user.walletAddress)
        setBalance(Number(onChainBal))
      } catch (err) {
        console.error('Failed to fetch on-chain balance:', err)
      }
    }
    fetchOnChainBalance()
  }, [session?.user?.walletAddress])

  // =======================
  // Load Campaigns
  // =======================
  useEffect(() => {
    if (!session?.user?.id) return
    const loadCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns')
        const data = await res.json()
        const filtered = (data as UICampaign[]).filter(
          (c) => c.createdBy === session.user.id
        )
        setCampaigns(filtered)
      } catch (err) {
        console.error('Failed to load campaigns:', err)
      }
    }
    loadCampaigns()
  }, [session?.user?.id])

  if (status === 'loading') return <div className="text-white p-6">Loading...</div>
  if (!session?.user) return null

  // =======================
  // CRUD Handlers
  // =======================
  const handleSubmit = async (campaign: BaseCampaign) => {
    try {
      if (editingCampaign?._id) {
        await fetch(`/api/campaigns/${editingCampaign._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaign),
        })
        setToast({ message: 'Campaign updated successfully', type: 'success' })
      } else {
        await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaign),
        })
        setToast({ message: 'Campaign created successfully', type: 'success' })
      }

      const res = await fetch('/api/campaigns')
      const data = await res.json()
      const filtered = (data as UICampaign[]).filter(
        (c) => c.createdBy === session.user.id
      )
      setCampaigns(filtered)
      setIsModalOpen(false)
      setEditingCampaign(null)
    } catch (err) {
      console.error('Failed to submit campaign:', err)
      setToast({ message: 'Failed to submit campaign', type: 'error' })
    }
  }

  const handleMarkFinished = async (id: string) => {
    setLoadingId(id)
    try {
      const resp = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finish' }),
      })
      const result = await resp.json()
      if (!resp.ok) {
        setToast({ message: result?.error || 'Failed to mark finished', type: 'error' })
        return
      }

      const res = await fetch('/api/campaigns')
      const data = await res.json()
      const filtered = (data as UICampaign[]).filter(
        (c) => c.createdBy === session.user.id
      )
      setCampaigns(filtered)

      setToast({
        message: result?.txLink
          ? 'Campaign finished — remaining funds rescued. View tx'
          : result?.message || 'Campaign marked as finished',
        type: 'success',
      })
    } catch (err) {
      console.error('Failed to mark finished:', err)
      setToast({ message: 'Failed to mark finished', type: 'error' })
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = (id: string) => {
    setToast({
      message: 'Are you sure you want to delete this campaign?',
      type: 'confirm',
      onConfirm: async () => {
        setLoadingId(id)
        try {
          await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
          setCampaigns((prev) => prev.filter((p) => p._id !== id))
          setToast({ message: 'Campaign deleted successfully', type: 'success' })
        } catch (err) {
          console.error('Failed to delete campaign:', err)
          setToast({ message: 'Failed to delete campaign', type: 'error' })
        } finally {
          setLoadingId(null)
        }
      },
      onCancel: () => setToast(null),
    })
  }

  // =======================
  // Derived Data (memoized)
  // =======================
  const current = useMemo(
    () =>
      campaigns
        .filter((c) => (c.status || 'active') === activeTab)
        .sort((a, b) => (a._id > b._id ? -1 : 1)),
    [campaigns, activeTab]
  )

  const totalPages = Math.max(1, Math.ceil((current?.length || 0) / itemsPerPage))
  const paginatedCampaigns = useMemo(
    () =>
      current.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [current, currentPage]
  )

  const toggleReadMore = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // reset current page when campaigns or tab change (keeps UX consistent)
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, campaigns])

  // =======================
  // JSX
  // =======================
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Topbar />
      <main className="w-full px-4 md:px-12 py-6">
        {/* Balance + Topup */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-medium">
            Balance{' '}
            <span className="text-green-400 font-bold">
              {balance.toFixed(2)} WR
            </span>
          </div>
          <button
            onClick={() => setShowTopup(true)}
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
        <div className="sticky top-18 bg-gray-900 z-40 pb-3">
          <CampaignTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Campaign list */}
        {current.length === 0 ? (
          <p className="text-center text-gray-400">No campaigns in this tab.</p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              {paginatedCampaigns.map((c) => {
                const isExpanded = expandedIds.includes(c._id)
                const desc = c.description ?? ''
                const shortDesc =
                  desc.length > 100 && !isExpanded ? desc.slice(0, 100) + '...' : desc

                const showControls = activeTab === 'active'

                return (
                  <div
                    key={c._id}
                    className="bg-gray-800 p-5 rounded shadow hover:shadow-lg transition"
                  >
                    <h3 className="text-lg font-bold text-blue-400 mb-2">
                      {c.title}
                    </h3>

                    {activeTab === 'active' && (
                      <p className="text-gray-300 whitespace-pre-wrap mb-2">
                        {shortDesc}{' '}
                        {desc.length > 100 && (
                          <button
                            onClick={() => toggleReadMore(c._id)}
                            className="text-blue-400 text-sm ml-1 hover:underline"
                          >
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </p>
                    )}

                    {Array.isArray(c.tasks) && c.tasks.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.tasks.map((t, i) => {
                          const icon = t.service.toLowerCase().includes('twitter')
                            ? '🐦'
                            : t.service.toLowerCase().includes('discord')
                            ? '💬'
                            : t.service.toLowerCase().includes('telegram')
                            ? '📨'
                            : '🔗'
                          return (
                            <div
                              key={i}
                              className="flex items-center text-sm font-medium bg-gray-700 rounded-2xl px-3 py-1 shadow-sm"
                            >
                              <span className="mr-2">{icon}</span>
                              <span className="text-yellow-300">{t.service}</span>
                              <span className="mx-1 text-gray-400">•</span>
                              <span className="text-gray-200">{t.type}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <p className="text-sm text-green-400 font-semibold mt-2">
                      Reward: {c.reward}
                    </p>
                    <p className="text-sm text-yellow-400 font-semibold">
                      Budget: {c.budget}
                    </p>

                    <p
                      className="text-sm text-gray-400 cursor-pointer hover:underline"
                      onClick={() => {
                        setParticipants(
                          Array.isArray(c.participants) ? c.participants : []
                        )
                        setShowParticipants(true)
                      }}
                    >
                      Contributors: <b>{c.contributors ?? 0}</b>
                    </p>

                    {showControls && (
                      <div className="flex gap-2 mt-3">
                        {c.status !== 'finished' && (
                          <>
                            <button
                              onClick={() => {
                                setEditingCampaign(c)
                                setIsModalOpen(true)
                              }}
                              className="px-3 py-1 rounded font-medium"
                              style={{
                                backgroundColor: '#facc15',
                                color: '#000',
                              }}
                            >
                              Edit
                            </button>
                            {c.contributors > 0 ? (
                              <button
                                onClick={() => handleMarkFinished(c._id)}
                                className="px-3 py-1 rounded font-medium flex items-center justify-center"
                                style={{
                                  backgroundColor: '#2563eb',
                                  color: '#fff',
                                }}
                                disabled={loadingId === c._id}
                              >
                                {loadingId === c._id
                                  ? 'Processing...'
                                  : 'Mark Finished'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDelete(c._id)}
                                className="px-3 py-1 rounded font-medium flex items-center justify-center"
                                style={{
                                  backgroundColor: '#dc2626',
                                  color: '#fff',
                                }}
                                disabled={loadingId === c._id}
                              >
                                {loadingId === c._id ? 'Processing...' : 'Delete'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-3 mt-6">
                <div className="flex gap-2 items-center">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="px-3 py-1 bg-gray-700 rounded disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1 bg-gray-700 rounded disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </>
        )}

        {/* Campaign Form */}
        <CampaignForm
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingCampaign(null)
          }}
          onSubmit={handleSubmit}
          editingCampaign={editingCampaign as unknown as BaseCampaign | null}
          setEditingCampaign={(c) =>
            setEditingCampaign(c as unknown as UICampaign | null)
          }
        />

        {/* Participants Modal */}
        {showParticipants && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-96 max-h-[70vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">Participants</h2>
              {participants.length === 0 ? (
                <p className="text-gray-400">No participants yet.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  {participants.map((p) => (
                    <li key={p} className="text-sm text-gray-200">
                      {p}
                    </li>
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

      {/* Topup Modal */}
      {showTopup && <USDCTransferModal onClose={() => setShowTopup(false)} />}

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

      {/* Toast */}
      {toast && toast.type !== 'confirm' && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {toast && toast.type === 'confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-gray-800 px-6 py-4 rounded shadow-md flex flex-col gap-4 max-w-sm w-full">
            <p className="text-white text-center">{toast.message}</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => { toast?.onConfirm(); setToast(null); }} className="px-4 py-2 bg-red-600 text-white rounded">Yes</button>
              <button onClick={() => { toast?.onCancel?.(); setToast(null); }} className="px-4 py-2 bg-gray-500 text-white rounded">No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
