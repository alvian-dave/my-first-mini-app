'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Crown, Fingerprint, Loader2, Trophy } from 'lucide-react'

export default function LeaderboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  // Tab default diganti ke 'weekly' sesuai urutan baru
  const [tab, setTab] = useState<'weekly' | 'all-time'>('weekly')
  const [hunters, setHunters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myUsername, setMyUsername] = useState<string>('')

  // 1. Fetch Leaderboard Data
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/leaderboard?timeframe=${tab}`)
        const data = await res.json()
        setHunters(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Leaderboard fetch error:", err)
        setHunters([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tab])

  // 2. Fetch My Username
  useEffect(() => {
    async function fetchMyName() {
      if (!session?.user?.id) return
      try {
        const res = await fetch(`/api/users?ids=${session.user.id}`)
        const data = await res.json()
        if (data && data.length > 0) {
          setMyUsername(data[0].username)
        }
      } catch (err) {
        console.error("User fetch error:", err)
      }
    }
    fetchMyName()
  }, [session?.user?.id])

  // 3. Logic Hitung Rank
  const currentUserStats = useMemo(() => {
    if (!session?.user?.id) return null
    const index = hunters.findIndex(h => h.name === myUsername || h.name === session.user.id)
    if (index === -1) {
      return {
        rank: "50+",
        name: myUsername || session.user.name || "HUNTER_" + session.user.id.slice(-4),
        points: 0
      }
    }
    return {
      rank: (index + 1).toString(),
      name: hunters[index].name,
      points: hunters[index].points
    }
  }, [hunters, myUsername, session])

  const top3 = hunters.slice(0, 3)
  const rest = hunters.slice(3)

  return (
    <div className="min-h-screen bg-[#020617] text-white px-4 pb-64">
      
      {/* 1. STICKY TOPBAR (DESAIN IDENTIK DENGAN STATS PAGE) */}
      <div className="sticky top-0 z-[100] -mx-4 px-4 pt-4 pb-3 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between border border-emerald-500/30 bg-black/40 p-2 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/hunter')} 
            className="text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all flex items-center gap-1 h-9"
          >
            <ChevronLeft size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
          </Button>
          <div className="pr-3 text-right">
            <span className="block text-[8px] font-black text-emerald-500 uppercase tracking-[0.3em]">Neural Net</span>
            <span className="text-xs font-black text-white italic uppercase tracking-tighter">Leaderboard</span>
          </div>
        </div>

        {/* 2. SUB-BAR TAB SWITCHER (WEEKLY DULU BARU ALL) */}
        <div className="mt-3 flex gap-2">
           <button 
             onClick={() => setTab('weekly')} 
             className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${tab === 'weekly' ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/5 text-slate-500'}`}
           >
             Weekly
           </button>
           <button 
             onClick={() => setTab('all-time')} 
             className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${tab === 'all-time' ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/5 text-slate-500'}`}
           >
             All Time
           </button>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center text-emerald-500 gap-4">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Neural Data...</p>
        </div>
      ) : (
        <>
          {/* PODIUM */}
          <div className="pt-6 h-64 mb-8">
            <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-[32px] p-6 h-full flex flex-col">
              <div className="flex items-end justify-between gap-3 h-full">
                <div className="flex-1 h-full flex flex-col justify-end items-center">
                  <span className="text-[10px] font-mono text-slate-500 mb-1">#02</span>
                  <div className="w-full bg-white/5 border border-white/10 rounded-t-2xl h-[60%] flex flex-col justify-center items-center p-2">
                    <p className="text-[8px] font-black truncate w-full text-center uppercase">{top3[1]?.name || '---'}</p>
                    <p className="text-[10px] font-mono text-emerald-500/60 font-bold">{top3[1]?.points?.toLocaleString() || 0} WR</p>
                  </div>
                </div>
                <div className="flex-1 h-full flex flex-col justify-end items-center">
                  <Crown size={20} className="text-yellow-500 mb-1 animate-bounce" />
                  <div className="w-full bg-emerald-500/20 border border-emerald-500/40 rounded-t-2xl h-[90%] flex flex-col justify-center items-center p-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <p className="text-[9px] font-black truncate w-full text-center uppercase">{top3[0]?.name || '---'}</p>
                    <p className="text-xs font-mono text-emerald-400 font-black">{top3[0]?.points?.toLocaleString() || 0} WR</p>
                  </div>
                </div>
                <div className="flex-1 h-full flex flex-col justify-end items-center">
                  <span className="text-[10px] font-mono text-slate-500 mb-1">#03</span>
                  <div className="w-full bg-white/5 border border-white/10 rounded-t-2xl h-[40%] flex flex-col justify-center items-center p-2">
                    <p className="text-[8px] font-black truncate w-full text-center uppercase">{top3[2]?.name || '---'}</p>
                    <p className="text-[10px] font-mono text-emerald-500/60 font-bold">{top3[2]?.points?.toLocaleString() || 0} WR</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RANK LIST */}
          <div className="space-y-2 pb-20">
            {rest.map((user, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 p-4 flex items-center justify-between rounded-2xl">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono font-black text-slate-600">{(i + 4).toString().padStart(2, '0')}</span>
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-slate-200">{user.name}</h4>
                    <p className="text-[8px] font-bold text-slate-500 uppercase">{user.missions || 0} Missions</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-black text-emerald-400">{user.points?.toLocaleString()} WR</span>
                  <p className="text-[7px] font-black text-slate-700 uppercase tracking-tighter">Credits</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* FOOTER SIGNATURE */}
      <div className="fixed bottom-[100px] left-0 right-0 p-6 z-[70] pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-emerald-600 rounded-[28px] p-4 flex items-center justify-between shadow-2xl border border-white/20">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center font-black italic">
                  {currentUserStats?.rank === "50+" ? "!" : (currentUserStats?.rank || "!")}
                </div>
                <div>
                  <p className="text-[7px] font-black text-emerald-100/70 uppercase tracking-widest leading-none mb-1">Authenticated Hunter</p>
                  <p className="text-[11px] font-black text-white italic uppercase flex items-center gap-1">
                    <Fingerprint size={12} /> {currentUserStats?.name || "IDENTITY_UNKNOWN"}
                  </p>
                </div>
             </div>
             <div className="text-right border-l border-white/10 pl-4">
                <p className="text-xs font-mono font-black text-white italic leading-none">
                  RANK #{currentUserStats?.rank || "--"}
                </p>
                <p className="text-[9px] font-black text-emerald-900 uppercase mt-1">
                  {currentUserStats?.points?.toLocaleString() || 0} WR
                </p>
             </div>
          </div>
        </div>
      </div>

    </div>
  )
}