'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, ArrowRight, MessageCircle, Wallet, 
  CheckCircle, Zap, Star, Target, LayoutGrid, Loader2 
} from 'lucide-react'

// Custom Components
import { Topbar } from '@/components/Topbar'
import TaskModal from '@/components/TaskModal' 
import { getWRCreditBalance } from '@/lib/getWRCreditBalance'
import ReferralModal from '@/components/ReferralModal'
import SpinFloatingButton from '@/components/hunter/SpinFloatingButton'

// --- Interfaces ---
interface Task {
  service: string
  type: string
  url: string
  done?: boolean
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

function CampaignDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > 120
  const shownText = expanded ? text : text.slice(0, 120)

  return (
    <div className="text-slate-300 my-2 whitespace-pre-wrap text-sm leading-relaxed">
      {shownText}
      {isLong && (
        <>
          {!expanded && <span className="text-slate-500">...</span>}{' '}
          <Button
            variant="link"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="p-0 h-auto text-emerald-400 hover:text-emerald-300 font-bold uppercase text-[10px] tracking-wider transition-all"
          >
            {expanded ? 'Show less' : 'Read more'}
          </Button>
        </>
      )}
    </div>
  )
}

export default function HunterDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [completedCampaigns, setCompletedCampaigns] = useState<Campaign[]>([])
  const [balance, setBalance] = useState(0)
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rejected'>('active')
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6
  const [openReferral, setOpenReferral] = useState(false)
  
  // --- LOADING STATE ---
  const [isDataLoading, setIsDataLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/')
  }, [status, router])

  const fetchBalance = useCallback(async () => {
    if (!session?.user?.walletAddress) return
    try {
      const bal = await getWRCreditBalance(session.user.walletAddress)
      setBalance(Number(bal))
    } catch (err) {
      console.error('Balance error:', err)
    }
  }, [session])

  const loadData = useCallback(async () => {
    if (!session?.user?.id) return
    setIsDataLoading(true) 
    try {
      const [resAll, resDone] = await Promise.all([
        fetch('/api/campaigns', { cache: 'no-store' }),
        fetch('/api/campaigns/completed', { cache: 'no-store' })
      ])
      if (resAll.ok) setCampaigns(await resAll.json())
      if (resDone.ok) setCompletedCampaigns(await resDone.json())
    } catch (err) {
      toast.error('Data synchronization failed')
    } finally {
      // Delay sedikit agar transisi mulus
      setTimeout(() => setIsDataLoading(false), 500)
    }
  }, [session])

  useEffect(() => {
    loadData()
    fetchBalance()
  }, [loadData, fetchBalance])

  useEffect(() => { setCurrentPage(1) }, [activeTab])

  const filteredCampaigns = useMemo(() => {
    let list: Campaign[] = []
    if (activeTab === 'active') {
      const doneIds = new Set(completedCampaigns.map(c => c._id))
      list = campaigns.filter(c => c.status === 'active' && !doneIds.has(c._id))
    } else if (activeTab === 'completed') {
      list = completedCampaigns
    } else {
      list = campaigns.filter(c => c.status === 'rejected')
    }
    return list.sort((a, b) => (b._id > a._id ? 1 : -1))
  }, [campaigns, completedCampaigns, activeTab])

  const paginated = filteredCampaigns.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const totalPages = Math.ceil(filteredCampaigns.length / pageSize)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-600 text-white border-none shadow-[0_0_10px_rgba(16,185,129,0.5)]">Available</Badge>
      case 'finished': return <Badge className="bg-blue-600 text-white border-none">Approved</Badge>
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>
      default: return <Badge variant="secondary">Pending</Badge>
    }
  }

  // Initializing App State (Gaya Promoter)
  if (status === 'loading') return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-emerald-500 font-black tracking-tighter italic">
      INITIALIZING...
    </div>
  )
  
  if (!session?.user) return null

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pb-20 selection:bg-emerald-500/30">
      <Topbar />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
        
        {/* Banner */}
        <div className="relative group overflow-hidden rounded-[32px] p-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-500 shadow-2xl transition-all duration-500 hover:scale-[1.01]">
          <div className="bg-[#020617]/90 rounded-[31px] py-8 px-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full translate-y-10" />
            <h2 className="relative text-3xl md:text-5xl font-black italic uppercase tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent leading-tight">
              Hunt the tasks.<br/>Claim your rewards.
            </h2>
            <div className="mt-4 h-[2px] w-32 mx-auto bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
            <p className="mt-4 text-[10px] uppercase tracking-[0.5em] text-emerald-400 font-black opacity-80">Verified tasks waiting for deployment</p>
          </div>
        </div>

        {/* Balance & Stats Row */}
        <div className="flex flex-row gap-3 items-stretch h-24">
          <Card className="flex-1 bg-slate-900/60 border-white/5 backdrop-blur-md rounded-[20px] overflow-hidden relative group hover:border-emerald-500/30 transition-all duration-500">
            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(16,185,129,0.15)] pointer-events-none" />
            <CardContent className="h-full p-4 flex flex-col justify-center relative z-10">
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Zap size={8} fill="currentColor" /> Earned Credits
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white tracking-tighter">
                    {balance.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 italic">WR</span>
                </div>
                <div className="px-3 py-1 bg-emerald-600/10 border border-emerald-500/20 rounded-lg">
                   <p className="text-[8px] font-black text-emerald-400 uppercase">Claimed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div
            onClick={() => setOpenReferral(true)}
            className="w-24 h-full bg-white hover:bg-emerald-50 text-black rounded-[20px] flex flex-col items-center justify-center gap-1.5 shadow-xl group transition-all border-b-4 border-slate-300 active:border-b-0 active:translate-y-1 relative overflow-hidden shrink-0 cursor-pointer select-none"
          >
            <div className="absolute inset-0 shadow-[inset_0_0_12px_rgba(0,0,0,0.05)] pointer-events-none" />
            <div className="p-1.5 bg-emerald-600 rounded-full text-white shadow-md group-hover:scale-110 transition-transform duration-300 relative z-10">
              <Target className="w-4 h-4" strokeWidth={3} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-tight relative z-10 leading-none">Referral</span>
          </div>
        </div>

        {/* STICKY TABS */}
        <div className="sticky top-[64px] z-40 -mx-4 px-4 py-4 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-white/10 p-1.5 rounded-full h-14 max-w-2xl mx-auto shadow-2xl">
              {['active', 'completed', 'rejected'].map((tab) => (
                <TabsTrigger 
                  key={tab} 
                  value={tab}
                  className="rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all 
                  text-slate-500 hover:text-slate-300
                  data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* --- LOADING SECTION (GAYA PROMOTER) --- */}
        {isDataLoading ? (
          <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-emerald-500/10 rounded-[40px] bg-emerald-500/[0.02] space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
              <Zap className="absolute text-emerald-500 animate-pulse" size={24} fill="currentColor" />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-400 animate-pulse">Initializing Tasks...</p>
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Synchronizing with Neural Network</p>
            </div>
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
            <p className="text-slate-600 font-black uppercase tracking-widest text-sm italic">No missions available in this sector.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {paginated.map(c => (
              <Card 
                key={c._id} 
                className="bg-slate-900/60 border-white/5 shadow-2xl rounded-[32px] overflow-hidden group hover:border-emerald-500/40 transition-all duration-500 flex flex-col relative"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent)] pointer-events-none" />
                <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.4)] pointer-events-none" />

                <CardHeader className="p-8 pb-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <Badge className="bg-white/5 text-slate-500 border-white/10 text-[9px] font-black px-2 py-0.5 rounded-md mb-2">
                         TASK ID: {c._id.slice(-6).toUpperCase()}
                      </Badge>
                      <CardTitle className="text-2xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors duration-300">
                        {c.title}
                      </CardTitle>
                    </div>
                    {getStatusBadge(activeTab === 'completed' ? 'finished' : c.status)}
                  </div>
                  <CardDescription className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest flex items-center gap-2">
                      <Star size={12} className="text-emerald-500" /> Reward: <span className="text-emerald-400">{c.reward} WR</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-8 flex-1 relative z-10">
                  <CampaignDescription text={c.description} />
                  <Separator className="my-6 bg-white/5" />
                  
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Required Mission Steps</p>
                    <div className="flex flex-wrap gap-2">
                      {c.tasks?.map((t, i) => (
                        <Badge 
                          key={i}
                          variant="secondary"
                          className="bg-black/50 text-[10px] text-slate-300 border border-white/10 px-3 py-1 rounded-full"
                        >
                          {t.service.includes('Twitter') ? '🐦' : '🔗'} {t.service} • {t.type}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between items-center bg-black/40 p-4 rounded-[20px] border border-white/5">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Availability</p>
                      <p className="text-sm font-black text-emerald-400">OPEN ACCESS</p>
                    </div>
                    <div className="h-8 w-[1px] bg-white/10" />
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black uppercase text-slate-300">
                        Pool: <b className="text-white">Active</b>
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-6 pt-2 bg-black/10 mt-6 border-t border-white/5 flex justify-center gap-3 relative z-10">
                  {activeTab === 'active' ? (
                    <Button
                      onClick={() => setSelectedCampaign(c)}
                      className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-lg shadow-emerald-900/40 border-t border-white/20 active:scale-95 transition-all"
                    >
                      Deploy Mission <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : activeTab === 'completed' ? (
                    <Button
                      disabled
                      className="flex-1 h-14 bg-blue-600/20 text-blue-400 font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl border border-blue-500/30"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Submission Secured
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="flex-1 h-14 bg-red-600/20 text-red-500 font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl border border-red-500/30"
                    >
                      Mission Terminated
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination - Hide during loading */}
        {!isDataLoading && totalPages > 1 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex items-center justify-center gap-1.5">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-9 w-9 p-0 bg-slate-800 text-white rounded-lg border border-white/5"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-9 w-9 rounded-lg text-xs font-black transition-all ${
                    currentPage === i + 1 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-9 w-9 p-0 bg-slate-800 text-white rounded-lg border border-white/5"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Sector {currentPage} / {totalPages}</p>
          </div>
        )}

        <SpinFloatingButton />
        
      </main>

      {/* Task Modal Integration */}
      {selectedCampaign && (
        <TaskModal
          campaignId={selectedCampaign._id}
          title={selectedCampaign.title}
          description={selectedCampaign.description}
          tasks={selectedCampaign.tasks || []}
          session={session}
          onClose={() => setSelectedCampaign(null)}
          onConfirm={async () => {
            try {
              await Promise.all([loadData(), fetchBalance()])
              setSelectedCampaign(null)
              setActiveTab('completed')
              toast.success('Mission Data Transmitted', {
                description: 'Awaiting network confirmation and reward distribution.'
              })
            } catch (err) {
              toast.error('Transmission Failure')
            }
          }}
        />
      )}

      {/* Referral Modal */}
      <ReferralModal
        isOpen={openReferral}
        onClose={() => setOpenReferral(false)}
      />

    </div>
  )
}