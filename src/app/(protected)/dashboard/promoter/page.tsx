'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'
import { CampaignForm } from '@/components/CampaignForm'
import { CampaignTabs } from '@/components/CampaignTabs'
import USDCTransferModal from '@/components/USDCTransferModal'
import Toast from '@/components/Toast'
import type { Campaign as BaseCampaign } from '@/types'
import { getWRCreditBalance } from '@/lib/getWRCreditBalance'

/**
 * Note:
 * - Saya mempertahankan semua logika dan UI seperti file JSX Anda.
 * - TypeScript guards ditambahkan supaya tidak terjadi akses ke `session.user` saat `session` null.
 * - Jika ada tipe props yang berbeda pada komponen internal Anda (CampaignForm, Toast, dll),
 *   file ini masih kompatibel karena penggunaan tipe umum (BaseCampaign / any casting pada props yang diperlukan).
 */

// UI Campaign type (tambahkan tasks)
type UICampaign = BaseCampaign & {
  _id: string
  contributors?: number
  createdBy?: string
  participants?: string[]
  tasks?: { service: string; type: string; url: string }[]
}

type ToastNormal = { message: string; type?: 'success' | 'error' }
type ToastConfirm = { message: string; type: 'confirm'; onConfirm: () => void; onCancel?: () => void }
type ToastState = ToastNormal | ToastConfirm | null

const PAGE_SIZE = 5
const DESCRIPTION_PREVIEW_LENGTH = 140

const PromoterDashboard: React.FC = () => {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<UICampaign[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'finished' | 'rejected'>('active')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<UICampaign | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [showChat, setShowChat] = useState(false)

  const [showTopup, setShowTopup] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [participants, setParticipants] = useState<string[]>([])

  // Toast state (bisa confirm atau normal)
  const [toast, setToast] = useState<ToastState>(null)

  const [loadingId, setLoadingId] = useState<string | null>(null)

  // pagination state per tab
  const [pages, setPages] = useState<{ active: number; finished: number; rejected: number }>({
    active: 1,
    finished: 1,
    rejected: 1,
  })

  // which campaign descriptions are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Redirect if unauthenticated — guard sudah ada
  useEffect(() => {
    if (status === 'unauthenticated') {
      // replace to avoid backnav to protected page
      router.replace('/home')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]) // don't put router in deps to avoid double-run in some setups

  // fetch on-chain balance when walletAddress available
  useEffect(() => {
    if (!session?.user?.walletAddress) return

    let mounted = true
    const fetchOnChainBalance = async () => {
      try {
        const onChainBal = await getWRCreditBalance(session.user.walletAddress)
        if (!mounted) return
        // cast to number defensively
        setBalance(Number(onChainBal ?? 0))
      } catch (err) {
        console.error('Failed to fetch on-chain balance:', err)
      }
    }

    fetchOnChainBalance()
    return () => {
      mounted = false
    }
  }, [session?.user?.walletAddress])

  // load campaigns created by this user
  useEffect(() => {
    if (!session?.user?.id) return

    let mounted = true
    const loadCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns')
        if (!res.ok) {
          console.error('Failed to fetch campaigns, status:', res.status)
          return
        }
        const data = (await res.json()) as UICampaign[]
        if (!mounted) return
        const filtered = data.filter((c) => c.createdBy === session.user.id)
        setCampaigns(filtered)
        // reset pagination when campaigns change: ensure current page is valid
        setPages({ active: 1, finished: 1, rejected: 1 })
      } catch (err) {
        console.error('Failed to load campaigns:', err)
      }
    }
    loadCampaigns()
    return () => {
      mounted = false
    }
  }, [session?.user?.id])

  if (status === 'loading') return <div className="text-white p-6">Loading...</div>
  if (!session?.user) return null

  // create / update
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

      // refresh list
      const res = await fetch('/api/campaigns')
      if (res.ok) {
        const data = (await res.json()) as UICampaign[]
        const filtered = data.filter((c) => c.createdBy === session.user.id)
        setCampaigns(filtered)
      } else {
        console.warn('Failed to refresh campaigns after submit, status:', res.status)
      }

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
        console.error('Mark finished failed:', result)
        setToast({ message: result?.error || 'Failed to mark finished', type: 'error' })
        return
      }

      // refresh campaigns list
      const res = await fetch('/api/campaigns')
      if (res.ok) {
        const data = (await res.json()) as UICampaign[]
        const filtered = data.filter((c) => c.createdBy === session.user.id)
        setCampaigns(filtered)
      }

      // show proper message depending on rescue result
      if (result?.txLink) {
        setToast({ message: 'Campaign finished — remaining funds rescued. View tx', type: 'success' })
        // optionally open result.txLink or show in UI
      } else {
        setToast({ message: result?.message || 'Campaign marked as finished', type: 'success' })
      }
    } catch (err) {
      console.error('Failed to mark finished:', err)
      setToast({ message: 'Failed to mark finished', type: 'error' })
    } finally {
      setLoadingId(null)
    }
  }

  // Delete with toast confirmation
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
    } as ToastConfirm)
  }

  // derive per-tab campaigns and pagination
  const campaignsByTab = useMemo(
    () => ({
      active: campaigns.filter((c) => (c.status ?? 'active') === 'active'),
      finished: campaigns.filter((c) => (c.status ?? 'active') === 'finished'),
      rejected: campaigns.filter((c) => (c.status ?? 'active') === 'rejected'),
    }),
    [campaigns]
  )

  const totalPagesFor = (tab: keyof typeof campaignsByTab) => {
    return Math.max(1, Math.ceil(campaignsByTab[tab].length / PAGE_SIZE))
  }

  const currentPageFor = (tab: keyof typeof campaignsByTab) => pages[tab]

  const setPageFor = (tab: keyof typeof campaignsByTab, page: number) => {
    setPages((prev) => ({ ...prev, [tab]: page }))
  }

  const paginatedFor = (tab: keyof typeof campaignsByTab) => {
    const all = campaignsByTab[tab]
    const page = currentPageFor(tab)
    const start = (page - 1) * PAGE_SIZE
    return all.slice(start, start + PAGE_SIZE)
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Current campaigns displayed
  const current = paginatedFor(activeTab)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Topbar />
      <main className="w-full px-4 md:px-12 py-6">
        {/* Balance + Topup */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-medium">
            Balance <span className="text-green-400 font-bold">{balance.toFixed(2)} WR</span>
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
          <CampaignTabs
            activeTab={activeTab}
            setActiveTab={(t) => {
              setActiveTab(t)
              // reset page for newly selected tab
              setPages((prev) => ({ ...prev, [t]: 1 }))
            }}
          />
        </div>

        {/* Campaign list */}
        {paginatedFor(activeTab).length === 0 ? (
          <p className="text-center text-gray-400">No campaigns in this tab.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {paginatedFor(activeTab).map((c) => (
              <div key={c._id} className="bg-gray-800 p-5 rounded shadow hover:shadow-lg transition">
                <h3 className="text-lg font-bold text-blue-400">{c.title}</h3>

                {/* DESCRIPTION: show truncated preview in all tabs, with Read more only for long descriptions */}
                {c.description && (
                  <p className="text-gray-300 my-2 whitespace-pre-wrap">
                    {expanded[c._id]
                      ? c.description
                      : c.description.length > DESCRIPTION_PREVIEW_LENGTH
                      ? c.description.slice(0, DESCRIPTION_PREVIEW_LENGTH) + '...'
                      : c.description}

                    {c.description.length > DESCRIPTION_PREVIEW_LENGTH && (
                      <button
                        className="ml-2 text-sm font-medium text-yellow-300 hover:underline"
                        onClick={() => toggleExpand(c._id)}
                      >
                        {expanded[c._id] ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </p>
                )}

                {/* Task List */}
                {Array.isArray(c.tasks) && c.tasks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.tasks.map((t, i) => {
                      const serviceIcon =
                        t.service.toLowerCase().includes('twitter') ? '🐦' :
                        t.service.toLowerCase().includes('discord') ? '💬' :
                        t.service.toLowerCase().includes('telegram') ? '📨' :
                        '🔗'

                      return (
                        <div
                          key={i}
                          className="flex items-center text-sm font-medium bg-gray-700 rounded-2xl px-3 py-1 shadow-sm"
                        >
                          <span className="mr-2">{serviceIcon}</span>
                          <span className="text-yellow-300">{t.service}</span>
                          <span className="mx-1 text-gray-400">•</span>
                          <span className="text-gray-200">{t.type}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <p className="text-sm text-green-400 font-semibold mt-2">Reward: {c.reward}</p>
                <p className="text-sm text-yellow-400 font-semibold">Budget: {c.budget}</p>

                <p
                  className="text-sm text-gray-400 cursor-pointer hover:underline"
                  onClick={() => {
                    setParticipants(Array.isArray(c.participants) ? c.participants : [])
                    setShowParticipants(true)
                  }}
                >
                  Contributors: <b>{c.contributors ?? 0}</b>
                </p>

                {/* ACTIONS: only show edit/delete/mark finished in 'active' tab (as requested) */}
                {activeTab === 'active' && (
                  <div className="flex gap-2 mt-3">
                    {c.status !== 'finished' && (
                      <>
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
                        { (c.contributors ?? 0) > 0 ? (
                          <button
                            onClick={() => handleMarkFinished(c._id)}
                            className="px-3 py-1 rounded font-medium flex items-center justify-center"
                            style={{ backgroundColor: '#2563eb', color: '#fff' }}
                            disabled={loadingId === c._id}
                            aria-busy={loadingId === c._id ? true : undefined}
                          >
                            {loadingId === c._id ? (
                              <>
                                <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="4"></circle>
                                  <path d="M22 12a10 10 0 00-10-10" stroke="#fff" strokeWidth="4" strokeLinecap="round"></path>
                                </svg>
                                Processing...
                              </>
                            ) : (
                              'Mark Finished'
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(c._id)}
                            className="px-3 py-1 rounded font-medium flex items-center justify-center"
                            style={{ backgroundColor: '#dc2626', color: '#fff' }}
                            disabled={loadingId === c._id}
                            aria-busy={loadingId === c._id ? true : undefined}
                          >
                            {loadingId === c._id ? (
                              <>
                                <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="4"></circle>
                                  <path d="M22 12a10 10 0 00-10-10" stroke="#fff" strokeWidth="4" strokeLinecap="round"></path>
                                </svg>
                                Processing...
                              </>
                            ) : (
                              'Delete'
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination controls - shown for the currently selected tab */}
        <div className="mt-6 flex flex-col items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPageFor(activeTab, Math.max(1, currentPageFor(activeTab) - 1))}
              className="px-3 py-1 rounded"
              style={{ backgroundColor: '#374151', color: '#fff' }}
              disabled={currentPageFor(activeTab) === 1}
            >
              Prev
            </button>

            {/* page numbers */}
            {Array.from({ length: totalPagesFor(activeTab) }).map((_, idx) => {
              const pageNum = idx + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => setPageFor(activeTab, pageNum)}
                  className={`px-3 py-1 rounded ${currentPageFor(activeTab) === pageNum ? 'font-bold' : ''}`}
                  style={{ backgroundColor: currentPageFor(activeTab) === pageNum ? '#111827' : '#1f2937', color: '#fff' }}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => setPageFor(activeTab, Math.min(totalPagesFor(activeTab), currentPageFor(activeTab) + 1))}
              className="px-3 py-1 rounded"
              style={{ backgroundColor: '#374151', color: '#fff' }}
              disabled={currentPageFor(activeTab) === totalPagesFor(activeTab)}
            >
              Next
            </button>
          </div>

          {/* show status like: "page 3 of 7" when there is more than 1 page */}
          <div className="text-sm text-gray-400 mt-2">
            Page {currentPageFor(activeTab)} of {totalPagesFor(activeTab)}
          </div>
        </div>

        {/* Modal form */}
        <CampaignForm
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingCampaign(null)
          }}
          onSubmit={handleSubmit}
          editingCampaign={editingCampaign as unknown as BaseCampaign | null}
          setEditingCampaign={(c: BaseCampaign | null) => setEditingCampaign(c as unknown as UICampaign | null)}
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
            <div className="flex justify-between items-center px-4 py-2" style={{ backgroundColor: '#16a34a', color: '#fff' }}>
              <span className="font-semibold">Global Chat</span>
              <button onClick={() => setShowChat(false)}>✕</button>
            </div>
            <GlobalChatRoom />
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && toast.type !== 'confirm' && (
        <Toast message={(toast as ToastNormal).message} type={(toast as ToastNormal).type} onClose={() => setToast(null)} />
      )}
      {toast && toast.type === 'confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-gray-800 px-6 py-4 rounded shadow-md flex flex-col gap-4 max-w-sm w-full">
            <p className="text-white text-center">{(toast as ToastConfirm).message}</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => { (toast as ToastConfirm).onConfirm(); setToast(null); }} className="px-4 py-2 bg-red-600 text-white rounded">Yes</button>
              <button onClick={() => { (toast as ToastConfirm).onCancel?.(); setToast(null); }} className="px-4 py-2 bg-gray-500 text-white rounded">No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PromoterDashboard
