'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  RefreshCcw, 
  History, 
  TrendingUp,
  Zap,
  Loader2
} from 'lucide-react'

interface FinanceData {
  ok: boolean;
  quickStats: {
    totalActiveParticipants: string;
    totalActiveUsed: string;
    totalRefunds: string;
  };
  ledger: Array<{
    id: string;
    name: string;
    status: 'Active' | 'Finished';
    used: string;
    budget: string;
    participants: string;
    remaining: string;
    refund?: string;
  }>;
}

export default function PromoterFinancePage() {
  const router = useRouter()
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFinance() {
      try {
        const res = await fetch('/api/finance', { cache: 'no-store' })
        const json = await res.json()
        if (json.ok) {
          // Sorting: Active di atas, Sisanya di bawah
          const sortedLedger = json.ledger.sort((a: any, b: any) => {
            if (a.status === 'Active' && b.status !== 'Active') return -1;
            if (a.status !== 'Active' && b.status === 'Active') return 1;
            return 0;
          });
          setData({ ...json, ledger: sortedLedger });
        }
      } catch (err) {
        console.error("Fetch Finance Error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchFinance()
  }, [])

  // Samakan dengan loading Analytics
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500 gap-4">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Neural Assets...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white px-4 pb-32 space-y-6 relative">
      
      {/* 1. STICKY TOPBAR */}
      <div className="sticky top-0 z-[60] -mx-4 px-4 pt-4 pb-3 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between border border-blue-500/30 bg-black/40 p-2 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.15)]">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/dashboard/promoter')}
            className="text-blue-400 hover:bg-blue-500/10 active:scale-95 transition-all flex items-center gap-1 h-9"
          >
            <ChevronLeft size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
          </Button>
          <div className="pr-3 text-right">
            <span className="block text-[8px] font-black text-blue-500 uppercase tracking-[0.3em]">Capital</span>
            <span className="text-xs font-black text-white italic uppercase tracking-tighter text-shadow-sm">Finance Hub</span>
          </div>
        </div>
      </div>

      {/* 2. QUICK ANALYTICS (Ganti Overall Balance yang dihapus) */}
      <div className="pt-2 grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/40 border border-blue-500/20 p-5 rounded-[24px]">
          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1 text-shadow-sm">
            <TrendingUp size={12} /> Active Participants
          </p>
          <p className="text-2xl font-black italic text-white tracking-tighter">
            {data?.quickStats.totalActiveParticipants}
            <span className="text-[10px] not-italic text-slate-500 ml-2 uppercase font-bold">Nodes</span>
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/20 to-slate-900/40 border border-emerald-500/10 p-5 rounded-[24px]">
          <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-1 text-shadow-sm">
            <RefreshCcw size={12} /> Total Refunds
          </p>
          <p className="text-2xl font-black italic text-white tracking-tighter">
            {data?.quickStats.totalRefunds}
            <span className="text-[10px] not-italic text-slate-500 ml-2 uppercase font-bold tracking-widest">WR</span>
          </p>
        </div>
      </div>

      {/* 3. CAMPAIGN LEDGER */}
      <div className="space-y-4 pt-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2 flex items-center gap-2">
          <History size={14} /> Campaign Ledger History
        </h3>
        
        <div className="space-y-3">
          {data?.ledger.map((cp, i) => {
            const usedVal = parseFloat(cp.used.replace(/,/g, '')) || 0;
            const budgetVal = parseFloat(cp.budget) || 1;
            const progress = Math.min(100, Math.round((usedVal / budgetVal) * 100));

            return (
              <div key={i} className={`bg-white/[0.02] border rounded-3xl p-5 space-y-4 transition-all ${cp.status === 'Active' ? 'border-blue-500/20 bg-blue-500/[0.02]' : 'border-white/5 opacity-80'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${cp.status === 'Active' ? 'border-blue-500 text-blue-500 bg-blue-500/10' : 'border-slate-600 text-slate-600 bg-slate-500/10'}`}>
                        {cp.status.toUpperCase()}
                      </span>
                      <span className="text-[9px] font-mono text-slate-600 uppercase">{cp.id}</span>
                    </div>
                    <h4 className="text-xs font-black uppercase text-white tracking-tight mt-1">{cp.name}</h4>
                  </div>
                  {cp.status === 'Finished' && (
                    <div className="text-right">
                      <span className="text-[8px] font-black uppercase text-slate-500 block leading-none tracking-widest mb-1">Liquidated</span>
                      <span className="text-xs font-black text-emerald-400">+{cp.refund} WR</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">WR Spent</p>
                    <p className="text-xs font-black text-white italic">{cp.used}</p>
                  </div>
                  <div className="text-center border-x border-white/5">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Hunter</p>
                    <p className="text-xs font-black text-blue-400 italic">{cp.participants}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Remaining</p>
                    <p className="text-xs font-black text-slate-400 italic">{cp.remaining}</p>
                  </div>
                </div>

                {cp.status === 'Active' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 tracking-widest">
                      <span>Neural Consumption</span>
                      <span className="text-blue-500">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 shadow-inner">
                      <div 
                        className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] rounded-full transition-all duration-1000" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. SYSTEM NOTE */}
      <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-4 flex items-start gap-4 mb-10">
        <Zap size={18} className="text-blue-500 mt-0.5 fill-blue-500/20" />
        <p className="text-[9px] font-bold text-slate-500 uppercase leading-tight tracking-tight italic">
          Capital from finished or deleted campaigns is automatically returned to your primary balance via neural rescue protocols within 24 hours.
        </p>
      </div>

    </div>
  )
}