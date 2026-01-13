'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  BarChart3, 
  Users, 
  Zap, 
  ShieldCheck, 
  PieChart, 
  TrendingUp,
  ArrowUpRight,
  Target,
  Globe,
  Loader2
} from 'lucide-react'

interface AnalyticsData {
  ok: boolean;
  stats: {
    totalParticipants: string;
    totalWRSpent: string;
    escrowHolding: string;
    conversionRate: string;
    globalReach: number;
  };
  growth: string; // Tambahkan ini agar match dengan API
  graphData: Array<{ label: string; value: string }>;
  efficiency: {
    usagePercent: string;
  };
}

export default function PromoterAnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics', { cache: 'no-store' })
        const json = await res.json()
        if (json.ok) setData(json)
      } catch (err) {
        console.error("Fetch Analytics Error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500 gap-4">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Neural Insights...</p>
      </div>
    )
  }

  const overviewStats = [
    { label: "Total Participants", value: data?.stats.totalParticipants || "0", icon: <Users size={16} />, color: "text-blue-400" },
    { label: "Total WR Spent", value: `${data?.stats.totalWRSpent || "0"} WR`, icon: <Zap size={16} />, color: "text-yellow-400" },
    { label: "Escrow Holding", value: `${data?.stats.escrowHolding || "0"} WR`, icon: <ShieldCheck size={16} />, color: "text-purple-400" },
    { label: "Conversion Rate", value: `${data?.stats.conversionRate || "0"}%`, icon: <Target size={16} />, color: "text-emerald-400" },
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-white px-4 pb-32 space-y-8 relative">
      
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
            <span className="block text-[8px] font-black text-blue-500 uppercase tracking-[0.3em]">Insights</span>
            <span className="text-xs font-black text-white italic uppercase tracking-tighter text-shadow-sm">Neural Analytics</span>
          </div>
        </div>
      </div>

      {/* 2. PERFORMANCE GRAPH CARD - MATCHED WITH GROWTH DATA */}
      <div className="pt-2">
        <div className="bg-gradient-to-br from-blue-900/20 via-slate-900/40 to-transparent border border-blue-500/20 rounded-[32px] p-6 relative overflow-hidden shadow-2xl">
          <div className="flex justify-between items-start mb-8 text-shadow-md">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-blue-400" />
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Growth Trajectory</p>
              </div>
              <h2 className="text-3xl font-black italic tracking-tighter">
                +{data?.growth || "0"}% 
                <span className="text-xs not-italic text-slate-500 font-bold ml-1 uppercase"> ALL-TIME EXPANSION</span>
              </h2>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <BarChart3 size={20} className="text-blue-400" />
            </div>
          </div>

          <div className="flex items-end gap-2 h-32">
            {data?.graphData.map((g, i) => {
              // Tinggi bar berdasarkan nilai kumulatif di stats.totalWRSpent
              const maxVal = parseFloat(data.stats.totalWRSpent) || 1;
              const currentVal = parseFloat(g.value) || 0;
              const heightPercent = (currentVal / maxVal) * 100;
              
              return (
                <div key={i} className="flex-1 group relative">
                  <div 
                    className={`w-full rounded-t-lg transition-all duration-1000 bg-blue-500/20 group-hover:bg-blue-400/40 ${i === data.graphData.length - 1 ? 'bg-blue-500 shadow-[0_0_15px_#3b82f6]' : ''}`} 
                    style={{ height: `${Math.max(10, heightPercent)}%` }} 
                  />
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-600 uppercase">
                    {g.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 3. GRID STATS */}
      <div className="grid grid-cols-2 gap-3">
        {overviewStats.map((stat, i) => (
          <div key={i} className="bg-slate-900/40 border border-white/5 p-5 rounded-[24px] group active:scale-95 transition-all">
            <div className={`${stat.color} mb-3 transition-transform group-hover:scale-110`}>
              {stat.icon}
            </div>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2">{stat.label}</p>
            <p className="text-xl font-black italic text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 4. EFFICIENCY MATRIX */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2 flex items-center gap-2">
          <PieChart size={14} /> Efficiency Matrix
        </h3>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase text-white tracking-tight">Escrow Distribution</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase italic">Capital utilization across all campaigns</p>
            </div>
            <ArrowUpRight size={18} className="text-slate-700" />
          </div>

          <div className="space-y-4">
            {/* Total Spent Efficiency (Usage) */}
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-blue-400">Total Spent Efficiency</span>
                <span className="text-white">{data?.efficiency.usagePercent || "0"}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6] transition-all duration-1000" 
                  style={{ width: `${data?.efficiency.usagePercent || 0}%` }} 
                />
              </div>
            </div>

            {/* Campaign Fulfillment (Conversion) */}
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-emerald-400">Campaign Fulfillment</span>
                <span className="text-white">{data?.stats.conversionRate || "0"}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981] transition-all duration-1000" 
                  style={{ width: `${data?.stats.conversionRate || 0}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. GLOBAL REACH NOTE */}
      <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 shrink-0 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
           <Globe size={20} className="animate-pulse" />
        </div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Global Neural Coverage</h4>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter leading-tight mt-0.5 italic text-shadow-sm">
            "Your campaigns have successfully penetrated {data?.stats.globalReach || 0}+ neural nodes across the network."
          </p>
        </div>
      </div>

    </div>
  )
}