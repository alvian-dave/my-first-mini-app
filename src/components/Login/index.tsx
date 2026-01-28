'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Rocket, Target, Loader2, ChevronRight } from 'lucide-react'

export const Login = () => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loadingRole, setLoadingRole] = useState<'promoter' | 'hunter' | null>(null)

  if (status === 'loading') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      <p className="text-[10px] font-bold text-slate-500 tracking-[0.3em]">LOADING SESSION...</p>
    </div>
  )
  
  if (!session?.user?.id) return (
    <div className="px-6 py-20 text-center">
      <p className="text-red-500 font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
        Please login first to continue.
      </p>
    </div>
  )

  const handleLogin = async (role: 'promoter' | 'hunter') => {
    setLoadingRole(role)
    try {
      const res = await fetch('/api/roles/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(role === 'promoter' ? '/dashboard/promoter' : '/dashboard/hunter')
      }
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message}`)
    } finally {
      setLoadingRole(null)
    }
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-4 py-8">
      
      {/* --- PROMOTER CARD --- */}
      <div 
        onClick={() => !loadingRole && handleLogin('promoter')}
        className={`relative group overflow-hidden rounded-[28px] border transition-all duration-300 active:scale-95 ${
          loadingRole === 'promoter' ? 'border-blue-500 scale-[0.98]' : 'border-white/10'
        }`}
      >
        {/* Inner Glow Effect */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(59,130,246,0.15)] group-hover:shadow-[inset_0_0_30px_rgba(59,130,246,0.3)] transition-all" />
        
        <div className="bg-[#0f172a]/90 backdrop-blur-md p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <Rocket className="w-6 h-6 text-blue-400" />
            </div>
            {loadingRole === 'promoter' && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
          </div>

          <h3 className="text-xl font-bold text-blue-400 mb-1">For Promoters</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Build your personal brand or grow your community.
          </p>

          <Button
            disabled={loadingRole !== null}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl h-12 flex items-center justify-between px-5"
          >
            <span>Promoter Dashboard</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* --- HUNTER CARD --- */}
      <div 
        onClick={() => !loadingRole && handleLogin('hunter')}
        className={`relative group overflow-hidden rounded-[28px] border transition-all duration-300 active:scale-95 ${
          loadingRole === 'hunter' ? 'border-emerald-500 scale-[0.98]' : 'border-white/10'
        }`}
      >
        {/* Inner Glow Effect */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(16,185,129,0.15)] group-hover:shadow-[inset_0_0_30px_rgba(16,185,129,0.3)] transition-all" />

        <div className="bg-[#0f172a]/90 backdrop-blur-md p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <Target className="w-6 h-6 text-emerald-400" />
            </div>
            {loadingRole === 'hunter' && <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />}
          </div>

          <h3 className="text-xl font-bold text-emerald-400 mb-1">For Bounty Hunters</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Earn crypto by completing simple tasks and proving you’re human.
          </p>

          <Button
            disabled={loadingRole !== null}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl h-12 flex items-center justify-between px-5"
          >
            <span>Hunter Dashboard</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

    </div>
  )
}