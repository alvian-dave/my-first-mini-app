'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { formatUnits } from 'ethers'
import { toast } from 'sonner'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs' 
import { 
  MessageCircle, Wallet, ArrowLeft, ArrowRight, Edit, 
  Trash2, CheckCircle, Users, Plus, Zap, Star
} from 'lucide-react'

// Custom Components
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'
import { CampaignForm } from '@/components/CampaignForm'
import USDCTransferModal from '@/components/USDCTransferModal'
import type { Campaign as BaseCampaign } from '@/types'
import { getWRCreditBalance } from '@/lib/getWRCreditBalance'

// --- Interfaces ---
type UICampaign = BaseCampaign & {
  _id: string
  contributors: number
  createdBy?: string
  participants?: string[]
  tasks?: { service: string; type: string; url: string }[]
  remainingWR?: string
}

// ## CampaignDescription Component (Internal Refactoring)
function CampaignDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > 100
  const shownText = expanded ? text : text.slice(0, 100)

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
            className="p-0 h-auto text-blue-400 hover:text-blue-300 font-bold uppercase text-[10px] tracking-wider transition-all"
          >
            {expanded ? 'Show less' : 'Read more'}
          </Button>
        </>
      )}
    </div>
  )
}

// =====================================
// ## PROMOTER DASHBOARD (FULL REFACTOR)
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
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  // Redirect jika belum login
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
      toast.error('Failed to fetch WR from blockchain') 
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

      if (allIds.length > 0) {
        const userRes = await fetch(`/api/users?ids=${allIds.join(',')}`)
        const users: { _id: string; username?: string }[] = await userRes.json()

        const userMap: Record<string, string> = {}
        users.forEach(u => userMap[u._id] = u.username || '(unknown)')

        const enriched = myCampaigns.map(c => ({
          ...c,
          participants: (c.participants || []).map(id => userMap[id] || '(unknown)')
        }))
        setCampaigns(enriched)
      } else {
        setCampaigns(myCampaigns)
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err)
      toast.error('Failed to load campaigns')
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

      toast.success(`Campaign ${method === 'PUT' ? 'updated' : 'created'} successfully`)
      await Promise.all([loadCampaigns(), fetchBalance()])
      setIsModalOpen(false)
      setEditingCampaign(null)
    } catch (err) {
      console.error('Failed to submit campaign:', err)
      toast.error('Failed to submit campaign')
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
        toast.error(result?.error || 'Failed to mark finished')
        return
      }
      
      await Promise.all([loadCampaigns(), fetchBalance()])
      toast.success('Campaign finished!')
      setActiveTab('finished')
    } catch (err) {
      toast.error('Failed to mark finished')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = (id: string) => {
    toast.warning('Are you sure you want to delete this campaign?', {
      id: `delete-campaign-${id}`,
      description: 'This action cannot be undone.',
      duration: 10000,
      action: {
        label: 'Confirm Delete',
        onClick: async () => {
          setLoadingId(id)
          try {
            await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
            setCampaigns(prev => prev.filter(p => p._id !== id))
            toast.success('Campaign deleted successfully')
          } catch (err) {
            toast.error('Failed to delete campaign')
          } finally {
            setLoadingId(null)
          }
        },
      },
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


  const getStatusBadge = (status: UICampaign['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-[0_0_10px_rgba(37,99,235,0.5)]">Active</Badge> 
      case 'finished':
        return <Badge className="bg-slate-600 hover:bg-slate-700 text-white border-none">Finished</Badge> 
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }
  
  if (status === 'loading') return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-blue-500 font-bold">LOADING...</div>
  if (!session?.user) return null

  // =========================
  // RETURN MAIN UI
  // =========================
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pb-20 selection:bg-blue-500/30">
      <Topbar />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
        
        {/* Banner - Lead the way */}
        <div className="relative group overflow-hidden rounded-[32px] p-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 shadow-2xl transition-all duration-500 hover:scale-[1.01]">
          <div className="bg-[#020617]/90 rounded-[31px] py-8 px-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full translate-y-10" />
            <h2 className="relative text-3xl md:text-5xl font-black italic uppercase tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent leading-tight">
              Lead the way.<br/>Fund the future.
            </h2>
            <div className="mt-4 h-[2px] w-32 mx-auto bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(37,99,235,0.8)]" />
            <p className="mt-4 text-[10px] uppercase tracking-[0.5em] text-blue-400 font-black opacity-80">Track the results in real-time</p>
          </div>
        </div>

{/* Balance & New Campaign Row - Mobile First Approach */}
<div className="flex flex-row gap-3 items-stretch h-24">
  {/* Balance Card - Sekarang lebih fleksibel */}
  <Card className="flex-1 bg-slate-900/60 border-white/5 backdrop-blur-md rounded-[20px] overflow-hidden relative group hover:border-blue-500/30 transition-all duration-500">
    {/* Soft Inner Glow Blue */}
    <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
    
    <CardContent className="h-full p-4 flex flex-col justify-center relative z-10">
      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5 mb-1">
        <Zap size={8} fill="currentColor" /> Credits
      </p>
      
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-white tracking-tighter">
            {balance.toFixed(2)}
          </span>
          <span className="text-[10px] font-bold text-slate-500 italic">WR</span>
        </div>
        
        <Button 
          onClick={() => setShowTopup(true)} 
          className="h-7 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black shadow-lg shadow-blue-900/20 border-t border-white/20 active:scale-90 transition-all"
        >
          TOPUP
        </Button>
      </div>
    </CardContent>
  </Card>

  {/* New Campaign Button - Dibuat Vertikal & Ramping (Square-ish) */}
  <Button
    onClick={() => { setEditingCampaign(null); setIsModalOpen(true); }}
    className="w-24 h-full bg-white hover:bg-slate-100 text-black rounded-[20px] flex flex-col items-center justify-center gap-1.5 shadow-xl group transition-all border-b-4 border-slate-300 active:border-b-0 active:translate-y-1 relative overflow-hidden shrink-0"
  >
    {/* Inner Glow White for Depth */}
    <div className="absolute inset-0 shadow-[inset_0_0_12px_rgba(0,0,0,0.05)] pointer-events-none" />
    
    <div className="p-1.5 bg-blue-600 rounded-full text-white shadow-md group-hover:scale-110 transition-transform duration-300 relative z-10">
      <Plus className="w-4 h-4" strokeWidth={3} />
    </div>
    <span className="text-[9px] font-black uppercase tracking-tight relative z-10 leading-none">New Task</span>
  </Button>
</div>

        {/* STICKY TABS - GLASSMORPHISM */}
        <div className="sticky top-[64px] z-40 -mx-4 px-4 py-4 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-white/10 p-1.5 rounded-full h-14 max-w-2xl mx-auto shadow-2xl">
              {['active', 'finished', 'rejected'].map((tab) => (
                <TabsTrigger 
                  key={tab} 
                  value={tab}
                  className="rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all 
                  text-slate-500 hover:text-slate-300
                  data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Campaign list */}
        {paginatedCampaigns.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
            <p className="text-slate-600 font-black uppercase tracking-widest text-sm italic">No campaigns found in this sector.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {paginatedCampaigns.map(c => {
              const remainingWRFormatted = c.remainingWR ? formatUnits(c.remainingWR, 18) : '0.00'

              return (
                <Card 
                  key={c._id} 
                  className="bg-slate-900/60 border-white/5 shadow-2xl rounded-[32px] overflow-hidden group hover:border-blue-500/40 transition-all duration-500 flex flex-col relative"
                >
                  {/* INNER BLUE LIGHT EFFECT */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent)] pointer-events-none" />
                  <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.4)] pointer-events-none" />

                  <CardHeader className="p-8 pb-4 relative z-10">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <Badge className="bg-white/5 text-slate-500 border-white/10 text-[9px] font-black px-2 py-0.5 rounded-md mb-2">
                           REF: {c._id.slice(-6).toUpperCase()}
                        </Badge>
                        <CardTitle className="text-2xl font-black text-white tracking-tight group-hover:text-blue-400 transition-colors duration-300">
                          {c.title}
                        </CardTitle>
                      </div>
                      {getStatusBadge(c.status)}
                    </div>
                    <CardDescription className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest flex items-center gap-2">
                        <Star size={12} className="text-blue-500" /> Reward: <span className="text-blue-400">{c.reward} WR</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-8 flex-1 relative z-10">
                    <CampaignDescription text={c.description} />
                    <Separator className="my-6 bg-white/5" />
                    
                    {/* Task List (LENGKAP) */}
                    {Array.isArray(c.tasks) && c.tasks.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Mission Tasks</p>
                        <div className="flex flex-wrap gap-2">
                          {c.tasks.map((t, i) => {
                            const serviceIcon =
                              t.service.toLowerCase().includes('twitter') ? '🐦' :
                              t.service.toLowerCase().includes('discord') ? '💬' :
                              t.service.toLowerCase().includes('telegram') ? '📨' : '🔗'

                            return (
                              <Badge 
                                key={i}
                                variant="secondary"
                                className="bg-black/50 hover:bg-black/80 text-[10px] text-slate-300 border border-white/10 px-3 py-1 rounded-full transition-all"
                              >
                                {serviceIcon} {t.service} • {t.type}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                        <p className="text-[10px] text-slate-500 italic">No missions assigned.</p>
                    )}

                    <div className="mt-8 flex flex-col sm:flex-row justify-between items-center bg-black/40 p-4 rounded-[20px] border border-white/5 shadow-inner">
                      <div className="text-center sm:text-left">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Budget Remaining</p>
                        <p className="text-lg font-black text-blue-400">{parseFloat(remainingWRFormatted).toFixed(2)} <span className="text-[10px] text-slate-500">WR</span></p>
                      </div>
                      <div className="h-[1px] w-full sm:h-8 sm:w-[1px] bg-white/10 my-2 sm:my-0" />
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-slate-400 hover:text-white flex items-center gap-2 group/btn"
                        onClick={() => {
                          setParticipants(Array.isArray(c.participants) ? c.participants : [])
                          setShowParticipants(true)
                        }}
                      >
                        <Users className="w-4 h-4 text-blue-500 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Contributors: <b className="text-white ml-1">{c.contributors ?? 0}</b>
                        </span>
                      </Button>
                    </div>
                  </CardContent>

                  {/* Footer - Action Buttons (LENGKAP) */}
                  <CardFooter className="p-6 pt-2 bg-black/10 mt-6 border-t border-white/5 flex justify-center gap-3 relative z-10">
                    {c.status !== 'finished' && (
                      <>
                        <Button
                          onClick={() => {
                            setEditingCampaign(c)
                            setIsModalOpen(true)
                          }}
                          className="flex-1 h-12 bg-slate-800/80 hover:bg-slate-700 text-slate-100 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl border border-white/5 transition-all"
                        >
                          <Edit className="w-4 h-4 mr-2 text-blue-500" /> Edit
                        </Button>

                        {c.contributors > 0 ? (
                          <Button
                            onClick={() => handleMarkFinished(c._id)}
                            className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-lg shadow-blue-900/40 border-t border-white/20 active:scale-95 transition-all"
                            disabled={loadingId === c._id}
                          >
                            {loadingId === c._id ? (
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                              <><CheckCircle className="w-4 h-4 mr-2" /> Finish</>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleDelete(c._id)}
                            className="w-14 h-12 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all flex items-center justify-center"
                            disabled={loadingId === c._id}
                          >
                            <Trash2 className="w-5 h-5" />
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

        <Separator className="bg-white/5 my-12" />

{/* Pagination (SMART DYNAMIC - SINGLE LINE) */}
{current.length > pageSize && (
  <div className="flex flex-col items-center gap-4 py-8 w-full px-4">
    <div className="flex items-center justify-center gap-1.5 w-full overflow-hidden">
      
      {/* PREV */}
      <Button
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className={`h-9 w-9 p-0 bg-slate-800 text-white rounded-lg border border-white/5 shrink-0 ${currentPage === 1 ? 'opacity-10' : 'active:scale-90'}`}
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-1.5">
        {/* HALAMAN PERTAMA: Selalu Tampil */}
        <Button
          onClick={() => setCurrentPage(1)}
          className={`h-9 w-9 rounded-lg text-xs font-black shrink-0 transition-all ${
            currentPage === 1 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border-t border-white/20' 
              : 'bg-slate-900 text-slate-500 border border-white/5'
          }`}
        >
          1
        </Button>

        {/* TITIK-TITIK AWAL: Tampil jika currentPage > 3 */}
        {currentPage > 3 && <span className="text-slate-700 font-bold px-0.5">...</span>}

        {/* HALAMAN TENGAH (DINAMIS): Tampil di sekitar halaman aktif */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(page => (
            page !== 1 && 
            page !== totalPages && 
            Math.abs(page - currentPage) <= 1
          ))
          .map((page) => (
            <Button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`h-9 w-9 rounded-lg text-xs font-black shrink-0 transition-all ${
                currentPage === page 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border-t border-white/20' 
                  : 'bg-slate-900 text-slate-500 border border-white/5'
              }`}
            >
              {page}
            </Button>
          ))}

        {/* TITIK-TITIK AKHIR: Tampil jika currentPage < totalPages - 2 */}
        {currentPage < totalPages - 2 && <span className="text-slate-700 font-bold px-0.5">...</span>}

        {/* HALAMAN TERAKHIR: Selalu Tampil (selama totalPages > 1) */}
        {totalPages > 1 && (
          <Button
            onClick={() => setCurrentPage(totalPages)}
            className={`h-9 w-9 rounded-lg text-xs font-black shrink-0 transition-all ${
              currentPage === totalPages 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border-t border-white/20' 
                : 'bg-slate-900 text-slate-500 border border-white/5'
            }`}
          >
            {totalPages}
          </Button>
        )}
      </div>

      {/* NEXT */}
      <Button
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
        className={`h-9 w-9 p-0 bg-slate-800 text-white rounded-lg border border-white/5 shrink-0 ${currentPage === totalPages ? 'opacity-10' : 'active:scale-90'}`}
      >
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
    
    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">
      Page {currentPage} / {totalPages}
    </p>
  </div>
)}
      </main>

      {/* Participants Modal (LENGKAP) */}
      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-[425px] rounded-[32px] overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-blue-400 uppercase italic tracking-tighter pt-4">Personnel Log</DialogTitle>
          </DialogHeader>
          <div className="py-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {participants.length === 0 ? (
              <p className="text-slate-500 text-center font-bold italic py-10">No personnel detected in this campaign.</p>
            ) : (
              <div className="grid gap-2">
                {participants.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-black text-xs">
                        {p.slice(0,1).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-slate-200">{p}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={() => setShowParticipants(false)} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all">
            DISMISS
          </Button>
        </DialogContent>
      </Dialog>

      {/* Campaign Form & Topup Modal */}
      <CampaignForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingCampaign(null); }}
        onSubmit={handleSubmit}
        editingCampaign={editingCampaign as any}
        setEditingCampaign={(c: any) => setEditingCampaign(c)}
      />
      {showTopup && <USDCTransferModal onClose={() => setShowTopup(false)} />}

{/* FLOATING CHAT - MODERN REDESIGN */}
<div className="fixed bottom-8 right-8 z-50">
  {!showChat ? (
    <Button
      size="icon"
      className="w-16 h-16 rounded-full shadow-[0_10px_40px_rgba(37,99,235,0.4)] bg-blue-600 hover:bg-blue-500 hover:scale-110 active:scale-95 transition-all duration-300 border-t border-white/30"
      onClick={() => setShowChat(true)}
    >
      <MessageCircle className="w-7 h-7" />
    </Button>
  ) : (
    <Card className="w-[90vw] md:w-96 h-[500px] max-h-[80dvh] bg-[#020617] text-slate-200 border border-white/10 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in slide-in-from-bottom-10 fixed bottom-8 right-8">
      
      {/* HEADER: Tetap Terlihat (Sticky-like behavior because of Flex) */}
      <CardHeader className="shrink-0 py-4 px-6 bg-gradient-to-r from-blue-700 to-indigo-700 flex flex-row items-center justify-between space-y-0 z-20">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Live Network</CardTitle>
        <button onClick={() => setShowChat(false)} className="text-xs font-black bg-black/20 hover:bg-black/40 px-3 py-1 rounded-full transition-colors">HIDE</button>
      </CardHeader>
      
      {/* AREA CHAT: Hanya area ini yang bisa di-scroll */}
      <CardContent className="flex-1 min-h-0 p-0 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth flex flex-col-reverse p-4">
          {/* PENTING: 'flex-reverse' akan memaksa chat mulai dari bawah. 
              Pastikan list chat di dalam <GlobalChatRoom /> di-render terbalik 
              atau komponen tersebut menangani auto-scroll ke bawah.
          */}
          <GlobalChatRoom />
        </div>
      </CardContent>

      {/* INPUT FIELD: Jika input field ada di dalam GlobalChatRoom, 
          pastikan komponen tersebut menaruh inputnya di luar area scroll. 
          Jika tidak, taruh komponen Input di sini agar dia 'Sticky' di bawah. */}
    </Card>
  )}
</div>
</div>
  )
}