'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  Activity, 
  Zap, 
  Target, 
  TrendingUp, 
  Cpu,
  Loader2
} from 'lucide-react'

interface NeuralStats {
  ok: boolean;
  stats: {
    neuralSync: string;
    tasksDone: string;
    earned: string;
    rank: string;
  };
  user: {
    username: string;
  };
  logs: Array<{
    msg: string;
    time: string;
    status: string;
  }>;
}

export default function HunterStatsPage() {
  const router = useRouter()
  const [data, setData] = useState<NeuralStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' })
        const json = await res.json()
        if (json.ok) setData(json)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-emerald-500 gap-4">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Neural Data...</p>
      </div>
    )
  }

  const stats = [
    { label: "Neural Sync", value: data?.stats.neuralSync || "0.1%", icon: <Activity size={16} />, color: "text-emerald-400" },
    { label: "Tasks Done", value: data?.stats.tasksDone || "0", icon: <Target size={16} />, color: "text-blue-400" },
    { label: "Earned", value: `${data?.stats.earned || 0} WR`, icon: <Zap size={16} />, color: "text-yellow-400" },
    { label: "Global Rank", value: data?.stats.rank || "#---", icon: <TrendingUp size={16} />, color: "text-purple-400" },
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-white relative">
      
      {/* 1. STICKY TOPBAR - FIXED STRUCTURE */}
      <div className="sticky top-0 z-[100] w-full bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between border border-emerald-500/30 bg-black/40 p-2 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/dashboard/hunter')}
            className="text-emerald-400 hover:bg-emerald-500/10 active:scale-95 flex items-center gap-1 h-9"
          >
            <ChevronLeft size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
          </Button>
          <div className="pr-3 text-right">
            <span className="block text-[8px] font-black text-emerald-500 uppercase tracking-[0.3em]">Network</span>
            <span className="text-xs font-black text-white italic uppercase tracking-tighter">Hunter Stats</span>
          </div>
        </div>
      </div>

      {/* 2. SCROLLABLE CONTENT */}
      <div className="px-4 pt-6 pb-32 space-y-8">
        
        {/* ANALYTICS HERO */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border border-emerald-500/20 rounded-[32px] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <Cpu size={64} className="text-emerald-500" />
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">
              Agent: {data?.user.username}
            </p>
          </div>
          <h2 className="text-4xl font-black italic">STABLE</h2>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Neural Connection: Synchronized</p>
          
          <div className="flex items-end gap-2 h-16 mt-10">
            {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
              <div key={i} className="flex-1 bg-emerald-500/10 rounded-t-md relative overflow-hidden">
                <div 
                   className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 bg-emerald-500/40 ${i === 6 ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : ''}`} 
                   style={{ height: `${h}%` }} 
                />
              </div>
            ))}
          </div>
        </div>

        {/* GRID STATS */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((item, i) => (
            <div key={i} className="bg-slate-900/40 border border-white/5 p-5 rounded-[24px] active:scale-95 transition-all">
              <div className={`${item.color} mb-3`}>{item.icon}</div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2">{item.label}</p>
              <p className="text-xl font-black italic text-white">{item.value}</p>
            </div>
          ))}
        </div>

        {/* RECENT ACTIVITY */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2 flex items-center gap-2">
            <TrendingUp size={14} /> Neural Activity
          </h3>
          
          <div className="space-y-2">
            {data?.logs && data.logs.length > 0 ? (
              data.logs.map((log, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 p-4 flex items-center justify-between rounded-2xl hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-300 truncate">
                      {log.msg}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600 whitespace-nowrap ml-2">{log.time}</span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">No Recent Activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}