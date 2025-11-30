'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { formatUnits } from 'ethers'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs' // Import Tabs
import { MessageCircle, Wallet, ArrowLeft, ArrowRight, Edit, Trash2, CheckCircle, Users } from 'lucide-react'

// Your Custom Components
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'
import { CampaignForm } from '@/components/CampaignForm'
// import { CampaignTabs } from '@/components/CampaignTabs' // Dihapus/diganti
import USDCTransferModal from '@/components/USDCTransferModal'
import Toast from '@/components/Toast'
import type { Campaign as BaseCampaign } from '@/types'
import { getWRCreditBalance } from '@/lib/getWRCreditBalance'

// --- Interfaces tetap sama ---
type UICampaign = BaseCampaign & {
  _id: string
  contributors: number
  createdBy?: string
  participants?: string[]
  tasks?: { service: string; type: string; url: string }[]
  remainingWR?: string
}

type ToastState =
  | { message: string; type?: 'success' | 'error' }
  | { message: string; type: 'confirm'; onConfirm: () => void; onCancel?: () => void }

// =====================================
// ## CampaignDescription Component (Internal Refactoring)
// =====================================
function CampaignDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > 100
  const shownText = expanded ? text : text.slice(0, 100)

  return (
    <p className="text-gray-300 my-2 whitespace-pre-wrap text-sm">
      {shownText}
      {isLong && (
        <>
          {!expanded && <span>...</span>}{' '}
          <Button
            variant="link"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="p-0 h-auto text-blue-400 hover:text-blue-300"
          >
            {expanded ? 'Show less' : 'Read more'}
          </Button>
        </>
      )}
    </p>
  )
}

// =====================================
// ## PROMOTER DASHBOARD
// =====================================
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  // 🔐 Redirect jika belum login
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/home')
  }, [status, router])

  // =========================
  // FETCH DATA
  // =========================
  const fetchBalance = useCallback(async () => {
    if (!session?.user?.walletAddress) return
    try {
      const onChainBal = await getWRCreditBalance(session.user.walletAddress)
      setBalance(Number(onChainBal))
    } catch (err) {
      console.error('Failed to fetch on-chain balance:', err)
    }
  }, [session])

  useEffect(() => {
    fetchBalance()
  }, [session, fetchBalance])

  const loadCampaigns = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const res = await fetch('/api/campaigns')
      const data: UICampaign[] = await res.json()

      const myCampaigns = data.filter(c => c.createdBy === session.user.id)
      
      const allIds = Array.from(new Set(myCampaigns.flatMap(c => c.participants || [])))

      const userRes = await fetch(`/api/users?ids=${allIds.join(',')}`)
      const users: { _id: string; username?: string }[] = await userRes.json()

      const userMap: Record<string, string> = {}
      users.forEach(u => userMap[u._id] = u.username || '(unknown)')

      const enriched = myCampaigns.map(c => ({
        ...c,
        participants: (c.participants || []).map(id => userMap[id] || '(unknown)')
      }))

      setCampaigns(enriched)
    } catch (err) {
      console.error('Failed to load campaigns:', err)
    }
  }, [session])

  useEffect(() => {
    loadCampaigns()
  }, [session, loadCampaigns])


  // =========================
  // HANDLERS
  // =========================
  const handleSubmit = async (campaign: BaseCampaign) => {
    try {
      const method = editingCampaign?._id ? 'PUT' : 'POST'
      const url = editingCampaign?._id ? `/api/campaigns/${editingCampaign._id}` : '/api/campaigns'

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
      })

      setToast({ message: `Campaign ${method === 'PUT' ? 'updated' : 'created'} successfully`, type: 'success' })

      // Reload data
      await Promise.all([loadCampaigns(), fetchBalance()])

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
      
      await Promise.all([loadCampaigns(), fetchBalance()])

      setToast({ message: result?.txLink ? 'Campaign finished & remaining funds rescued. View tx' : 'Campaign marked as finished', type: 'success' })
      setActiveTab('finished')
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
          setCampaigns(prev => prev.filter(p => p._id !== id))
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
  
  // =========================
  // FILTER & PAGINATION LOGIC
  // =========================
  const current = useMemo(() => {
    return campaigns
      .filter(c => (c.status || 'active') === activeTab)
      .sort((a, b) => (a._id > b._id ? -1 : 1))
  }, [campaigns, activeTab])

  const totalPages = Math.ceil(current.length / pageSize)
  const paginatedCampaigns = current.slice((currentPage - 1) * pageSize, currentPage * pageSize)


  // =========================
  // RENDER HELPERS
  // =========================
  const getStatusBadge = (status: UICampaign['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Active</Badge> 
      case 'finished':
        return <Badge variant="default" className="bg-gray-500 hover:bg-gray-600 text-white">Finished</Badge> 
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }
  
  if (status === 'loading') return <div className="text-white p-6">Loading...</div>
  if (!session?.user) return null

  // =========================
  // RETURN MAIN UI
  // =========================
  return (
    <div className="min-h-screen bg-gray-900 text-white" id="app-scroll">
      <Topbar />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        
        {/* Banner - Card dengan background gradient Biru/Hijau */}
        <Card className="mb-8 border-0 shadow-xl" style={{ background: 'linear-gradient(to right, #2563eb, #16a34a)' }}>
          <CardContent className="py-4 text-center">
            <p className="font-semibold text-white text-lg">
              "Lead the way. Fund the future. Track the results."
            </p>
          </CardContent>
        </Card>

        {/* Balance Status & Topup Button */}
        <div className="flex justify-between items-center mb-8">
          <Card className="flex-1 bg-gray-800 border-gray-700 mr-4">
            <CardContent className="py-3 px-4 flex items-center justify-start gap-3 overflow-hidden">
              <Wallet className="w-5 h-5 text-blue-400 shrink-0" />
              {/* PERBAIKAN BALANCE: Tambahkan whitespace-nowrap dan text-ellipsis */}
              <p className="text-gray-300 text-lg flex items-center min-w-0">
                <span className="shrink-0 mr-1">Balance:</span>
                <span 
                  className="text-blue-400 font-bold whitespace-nowrap overflow-hidden text-ellipsis"
                  title={balance.toFixed(18)} // Tooltip untuk saldo penuh
                >
                  {balance.toFixed(2)} WR
                </span>
              </p>
            </CardContent>
          </Card>
          
          <Button
            onClick={() => setShowTopup(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-md shrink-0"
          >
            Topup
          </Button>
        </div>

        {/* Create Campaign */}
        <div className="text-center mb-8">
          <Button
            onClick={() => {
              setEditingCampaign(null)
              setIsModalOpen(true)
            }}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition"
          >
            + Create New Campaign
          </Button>
        </div>

        {/* Tabs - Menggunakan struktur Shadcn Tabs yang diminta dengan tema Biru */}
        <div className="sticky top-14 z-40 bg-gray-900 py-3 mb-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-800 h-auto p-1">
                    {['active', 'finished', 'rejected'].map((tab) => (
                        <TabsTrigger 
                            key={tab} 
                            value={tab}
                            // Ganti green-600 menjadi blue-600
                            className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </div>
        <Separator className="bg-gray-700 mb-6" />

        {/* Campaign list */}
        {paginatedCampaigns.length === 0 ? (
          <p className="text-center text-gray-400 py-12">📝 No campaigns available in the {activeTab} tab.</p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {paginatedCampaigns.map(c => {
              const remainingWRFormatted = c.remainingWR
                ? formatUnits(c.remainingWR, 18)
                : '0.00'

              return (
                <Card 
                  key={c._id} 
                  className="bg-gray-800 border-gray-700 shadow-xl hover:shadow-blue-500/20 transition-all duration-300 flex flex-col"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl font-bold text-blue-400">{c.title}</CardTitle>
                      {getStatusBadge(c.status)}
                    </div>
                    <CardDescription className="text-sm text-gray-400 mt-2">
                        Reward: <span className="text-blue-400 font-semibold">{c.reward}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <CampaignDescription text={c.description} />
                    <Separator className="my-4 bg-gray-700" />
                    
                    {/* Task List */}
                    {Array.isArray(c.tasks) && c.tasks.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        <p className="font-medium text-yellow-400">Required Tasks:</p>
                        <div className="flex flex-wrap gap-2">
                          {c.tasks.map((t, i) => {
                            const serviceIcon =
                              t.service.toLowerCase().includes('twitter') ? '🐦' :
                              t.service.toLowerCase().includes('discord') ? '💬' :
                              t.service.toLowerCase().includes('telegram') ? '📨' :
                              '🔗'

                            return (
                              <Badge 
                                key={i}
                                variant="secondary"
                                className="bg-gray-700 text-xs text-blue-400"
                              >
                                {serviceIcon} {t.service} • {t.type}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">No tasks defined.</p>
                    )}

                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm">
                      <p className="text-yellow-400 font-semibold mb-2 sm:mb-0">
                        Budget Left: {remainingWRFormatted} WR
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-gray-400 hover:text-gray-300 flex items-center gap-1"
                        onClick={() => {
                          setParticipants(Array.isArray(c.participants) ? c.participants : [])
                          setShowParticipants(true)
                        }}
                      >
                        <Users className="w-4 h-4" />
                        Contributors: <b className="text-white ml-1">{c.contributors ?? 0}</b>
                      </Button>
                    </div>
                  </CardContent>

                  {/* Footer - Action Buttons */}
                  <CardFooter className="pt-4 px-6 flex justify-center gap-4">
                    {c.status !== 'finished' && (
                      <>
                        <Button
                          onClick={() => {
                            setEditingCampaign(c)
                            setIsModalOpen(true)
                          }}
                          className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold transition"
                        >
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>

                        {c.contributors > 0 ? (
                          <Button
                            onClick={() => handleMarkFinished(c._id)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                            disabled={loadingId === c._id}
                            aria-busy={loadingId === c._id}
                          >
                            {loadingId === c._id ? (
                              <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="4"></circle>
                                <path d="M22 12a10 10 0 00-10-10" stroke="#fff" strokeWidth="4" strokeLinecap="round"></path>
                              </svg>
                            ) : (
                              <><CheckCircle className="w-4 h-4 mr-2" /> Finish</>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleDelete(c._id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold transition"
                            disabled={loadingId === c._id}
                            aria-busy={loadingId === c._id}
                          >
                            {loadingId === c._id ? (
                              <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="4"></circle>
                                <path d="M22 12a10 10 0 00-10-10" stroke="#fff" strokeWidth="4" strokeLinecap="round"></path>
                              </svg>
                            ) : (
                              <><Trash2 className="w-4 h-4 mr-2" /> Delete</>
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        <Separator className="bg-gray-700 my-6" />

        {/* Pagination */}
        {current.length > pageSize && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex justify-center items-center gap-2 flex-wrap">
              {/* Prev */}
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant={currentPage === 1 ? 'outline' : 'default'}
                className={`bg-yellow-500 hover:bg-yellow-600 text-black font-bold ${currentPage === 1 ? 'opacity-50 cursor-not-allowed border-yellow-500 bg-transparent text-yellow-500' : ''}`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Prev
              </Button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                .map((page, idx, arr) => {
                  const prevPage = arr[idx - 1]
                  const showEllipsis = prevPage && page - prevPage > 1

                  return (
                    <span key={page} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-1 text-gray-500">..</span>
                      )}
                      <Button
                        onClick={() => setCurrentPage(page)}
                        variant={currentPage === page ? 'default' : 'secondary'}
                        className={currentPage === page ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}
                      >
                        {page}
                      </Button>
                    </span>
                  )
                })}

              {/* Next */}
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                variant={currentPage === totalPages ? 'outline' : 'default'}
                className={`bg-yellow-500 hover:bg-yellow-600 text-black font-bold ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed border-yellow-500 bg-transparent text-yellow-500' : ''}`}
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Status page */}
            <p className="text-sm text-gray-500 mt-2">
              Page {currentPage} of {totalPages}
            </p>
          </div>
        )}
      </main>

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

      {/* Participants modal (using Shadcn Dialog) */}
      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-400">Participants List</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-[50vh] overflow-y-auto">
            {participants.length === 0 ? (
              <p className="text-gray-400">No participants yet.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {participants.map(p => (
                  <li key={p} className="text-sm text-gray-200">{p}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setShowParticipants(false)}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Topup Modal */}
      {showTopup && <USDCTransferModal onClose={() => setShowTopup(false)} />}

      {/* Floating Chat */}
      <div className="fixed bottom-6 left-4 z-50">
        {!showChat ? (
          <div className="text-center">
            <Button
              size="icon"
              className="p-3 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 hover:scale-105 transition duration-300"
              onClick={() => setShowChat(true)}
              aria-label="Open Global Chat"
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
            <p className="text-xs text-gray-400 mt-1">Chat</p>
          </div>
        ) : (
          <Card className="w-80 h-96 bg-white text-black rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <CardHeader className="py-2 px-4 bg-blue-600 text-white flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-white">Global Chat</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                className="w-6 h-6 hover:bg-blue-700 text-white p-0"
                onClick={() => setShowChat(false)}
                aria-label="Close Chat"
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <GlobalChatRoom />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Toast (Konfirmasi dan Pemberitahuan) */}
      {toast && toast.type !== 'confirm' && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {toast && toast.type === 'confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="bg-gray-800 border-gray-700 max-w-sm w-full">
            <CardContent className="px-6 py-6 flex flex-col gap-6">
              <p className="text-white text-center text-lg">{toast.message}</p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => { toast.onConfirm(); setToast(null); }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Yes
                </Button>
                <Button
                  onClick={() => { toast.onCancel?.(); setToast(null); }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  No
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}