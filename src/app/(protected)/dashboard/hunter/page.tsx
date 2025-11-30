'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, ArrowRight, MessageCircle, Wallet, CheckCircle } from 'lucide-react'

// Your Custom Components
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom' // Pastikan file ini sudah di-patch
import TaskModal from '@/components/TaskModal' // Diasumsikan sudah di-style
import Toast from '@/components/Toast' // Diasumsikan sudah di-style
import { getWRCreditBalance } from '@/lib/getWRCreditBalance'

// --- Interfaces tetap sama ---
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

// =====================================
// ## HUNTER DASHBOARD
// =====================================
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
  // FILTER & SORT & PAGINATION
  // =========================
  const filtered = useMemo(() => {
    let result: Campaign[] = []
    if (activeTab === 'active') {
      const completedIds = new Set(completedCampaigns.map((c) => c._id))
      result = campaigns.filter((c) => c.status === 'active' && !completedIds.has(c._id))
    }
    if (activeTab === 'completed') result = completedCampaigns
    if (activeTab === 'rejected') result = campaigns.filter((c) => c.status === 'rejected')
    
    return result.sort((a, b) => (a._id > b._id ? 1 : -1))
  }, [campaigns, completedCampaigns, activeTab])

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

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

  // =========================
  // RENDER HELPERS
  // =========================

  // Menentukan warna badge/status
  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">Active</Badge>
      case 'finished':
        return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">Finished</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }

  const getSubmissionStatusBadge = (status: string) => {
    // Asumsi status submission (di completed tab)
    if (status === 'finished') {
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Approved</Badge>
    }
    return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Submitted</Badge>
  }
  
  return (
    // Gunakan 'app-scroll' sebagai ID untuk event listener di Topbar
    <div className="min-h-screen bg-gray-900 w-full" id="app-scroll"> 
      <Topbar />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        
        {/* Banner - Menggunakan Card dengan background gradient Hijau/Biru */}
        <Card className="mb-8 border-0 shadow-xl" style={{ background: 'linear-gradient(to right, #16a34a, #3b82f6)' }}>
            <CardContent className="py-4 text-center">
                <p className="font-semibold text-white text-lg">
                    "Every task you complete brings you closer to greatness..."
                </p>
            </CardContent>
        </Card>

        {/* Tabs */}
        <div className="sticky top-14 z-40 bg-gray-900 py-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-800 h-auto p-1">
                    {['active', 'completed', 'rejected'].map((tab) => (
                        <TabsTrigger 
                            key={tab} 
                            value={tab}
                            className="text-white data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </div>
        
        {/* Balance Status */}
        <Card className="mb-8 bg-gray-800 border-gray-700">
            <CardContent className="py-3 flex items-center justify-center gap-3">
                <Wallet className="w-5 h-5 text-green-400" />
                <p className="text-gray-300 text-lg">
                    Your Balance: <span className="text-green-400 font-bold ml-1">{dbBalance.toFixed(2)} WR</span>
                </p>
            </CardContent>
        </Card>


        {/* Task Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentCampaigns.length === 0 ? (
            <p className="text-center text-gray-400 col-span-full py-12">🎉 No tasks available in the {activeTab} tab.</p>
          ) : (
            currentCampaigns.map((c) => {
              const isExpanded = expandedIds.has(c._id)
              const displayedDesc = isExpanded
                ? c.description
                : c.description.length > 120
                ? c.description.slice(0, 120) + '...'
                : c.description

              return (
                <Card 
                    key={c._id} 
                    className="bg-gray-800 border-gray-700 shadow-xl hover:shadow-green-500/20 transition-all duration-300 flex flex-col"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl font-bold text-green-400">{c.title}</CardTitle>
                        {activeTab === 'completed' ? getSubmissionStatusBadge(c.status) : getStatusBadge(c.status)}
                    </div>
                    <CardDescription className="text-sm text-gray-400 mt-2">
                        Reward: <span className="text-green-400 font-semibold">{c.reward}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1">
                    {/* Description Section */}
                    {activeTab === 'active' && (
                        <>
                            <p className="text-gray-300 mb-3 whitespace-pre-line text-sm">
                                {displayedDesc}
                            </p>
                            {c.description.length > 120 && (
                                <Button
                                    variant="link"
                                    onClick={() => toggleExpand(c._id)}
                                    className="p-0 h-auto text-green-400 hover:text-green-300"
                                >
                                    {isExpanded ? 'Show Less' : 'Read More'}
                                </Button>
                            )}
                        </>
                    )}
                    
                    <Separator className="my-4 bg-gray-700" />

                    {/* Task List / Submission Status */}
                    <div className="space-y-2">
                        <p className="font-medium text-yellow-400 flex items-center gap-2">
                            {activeTab === 'active' ? 'Required Tasks:' : 'Submitted Details:'}
                        </p>
                        
                        {c.tasks && c.tasks.length > 0 ? (
                            <ul className="text-sm text-gray-300 space-y-1">
                                {c.tasks.map((t, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <Badge 
                                            variant="secondary" 
                                            className={`bg-gray-700 text-xs ${activeTab === 'active' ? 'text-yellow-400' : 'text-green-400'}`}
                                        >
                                            {t.service}
                                        </Badge>
                                        <span className="text-gray-300">{t.type}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No tasks defined.</p>
                        )}
                    </div>
                  </CardContent>

                  {/* Footer - Action Button */}
                  <CardFooter className="pt-4">
                    {activeTab === 'active' && (
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 transition"
                            onClick={() => setSelectedCampaign(c)}
                            disabled={isLoading(c._id)}
                        >
                            {isLoading(c._id) ? 'Loading...' : 'Complete & Submit Task'}
                        </Button>
                    )}
                    {activeTab === 'completed' && (
                        <Button
                            variant="outline"
                            className="w-full border-green-500 text-green-400 hover:bg-green-900/50"
                            disabled
                        >
                            <CheckCircle className="w-4 h-4 mr-2" /> Submission Sent
                        </Button>
                    )}
                    {activeTab === 'rejected' && (
                        <Button
                            variant="destructive"
                            className="w-full"
                            disabled
                        >
                            Rejected (Review Required)
                        </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })
          )}
        </div>
      </main>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex justify-center items-center gap-2 flex-wrap">
            {/* Prev */}
            <Button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              variant={currentPage === 1 ? 'ghost' : 'default'}
              className={`bg-yellow-500 hover:bg-yellow-600 text-black font-bold ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Prev
            </Button>

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
                      <span className="px-1 text-gray-500">...</span>
                    )}
                    <Button
                      onClick={() => setCurrentPage(page)}
                      variant={currentPage === page ? 'default' : 'secondary'}
                      className={currentPage === page ? 'bg-green-600 hover:bg-green-700 text-white font-bold' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}
                    >
                      {page}
                    </Button>
                  </span>
                )
              })}

            {/* Next */}
            <Button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              variant={currentPage === totalPages ? 'ghost' : 'default'}
              className={`bg-yellow-500 hover:bg-yellow-600 text-black font-bold ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Info bar di bawah */}
          <p className="text-sm text-gray-500 mt-2">
            Showing {Math.min(indexOfFirst + 1, filtered.length)} - {Math.min(indexOfLast, filtered.length)} of {filtered.length} Campaigns | Page {currentPage} of {totalPages}
          </p>
        </div>
      )}


      {/* Modal Task (Assume TaskModal already uses Shadcn Dialog/styling) */}
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

      
    {/* Floating Chat (Perbaikan Layout Chat Room di sini) */}
    <div className="fixed bottom-6 left-6 z-50">
      {!showChat ? (
        <div className="text-center">
          <Button
            size="icon"
            className="p-3 rounded-full shadow-lg bg-green-600 hover:bg-green-700 hover:scale-105 transition duration-300"
            onClick={() => setShowChat(true)}
            aria-label="Open Global Chat"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
          <p className="text-xs text-gray-400 mt-1">Chat</p>
        </div>
      ) : (
        // CARD CONTAINER UNTUK CHAT ROOM
        <Card className="w-80 h-96 bg-white text-black rounded-xl shadow-2xl overflow-hidden flex flex-col">
          
          {/* PERBAIKAN: Gunakan 'py-2' (lebih ramping dari p-3) dan hapus 'h-[52px]' */}
          <CardHeader className="py-2 px-4 bg-green-600 text-white flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-white">Global Chat</CardTitle>
            <Button
              size="icon"
              variant="ghost"
              // Gunakan styling ukuran kecil (w-6 h-6) untuk tombol X agar header ramping
              className="w-6 h-6 hover:bg-green-700 text-white p-0"
              onClick={() => setShowChat(false)}
              aria-label="Close Chat"
            >
              ✕
            </Button>
          </CardHeader>
          
          {/* CardContent tetap menggunakan flex-1 dan p-0 */}
          <CardContent className="flex-1 p-0 overflow-hidden">
            <GlobalChatRoom /> 
          </CardContent>
        </Card>
      )}
    </div>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}