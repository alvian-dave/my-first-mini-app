'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  Share2, 
  ShieldCheck, 
  Cpu, 
  CheckCircle2, 
  Link2, 
  MousePointerClick, 
  Gift,
  Zap
} from 'lucide-react'

export default function HowToStartHunter() {
  const router = useRouter()

  const steps = [
    {
      title: "Neural Connection",
      desc: "Link your required social media accounts to sync with the protocol.",
      icon: <Link2 size={18} />,
    },
    {
      title: "Execute Missions",
      desc: "Perform tasks such as Follow, Join Group, Retweet, or Like as specified in the campaign.",
      icon: <MousePointerClick size={18} />,
    },
    {
      title: "Verification Phase",
      desc: "Click 'Verify' after completing each task to let the system validate your actions.",
      icon: <ShieldCheck size={18} />,
    },
    {
      title: "Claim Rewards",
      desc: "Once all tasks are verified, the 'Submit' button activates. Click it to instantly receive your credits.",
      icon: <Gift size={18} />,
    }
  ]

  return (
    // Mengikuti struktur Stats: Tanpa overflow-x-hidden agar sticky berfungsi normal
    <div className="min-h-screen bg-[#020617] text-white px-4 pb-32 space-y-8 relative">
      
      {/* 1. STICKY TOPBAR - MATCHING STATS EXACTLY */}
      <div className="sticky top-0 z-[60] -mx-4 px-4 pt-4 pb-3 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5">
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
            <span className="block text-[8px] font-black text-emerald-500 uppercase tracking-[0.3em]">Protocol</span>
            <span className="text-xs font-black text-white italic uppercase tracking-tighter">Guide</span>
          </div>
        </div>
      </div>

      {/* 2. HERO HEADER */}
      <div className="pt-2 text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <Cpu size={12} className="animate-spin-slow" />
          <span className="text-[10px] font-black uppercase tracking-widest">System Operational</span>
        </div>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">How to <span className="text-emerald-500">Earn</span></h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest max-w-[250px] mx-auto">Master the neural protocol and maximize your credits.</p>
      </div>

      {/* 3. VERTICAL STEPPER */}
      <div className="space-y-8 relative before:absolute before:left-[27px] before:top-2 before:bottom-2 before:w-[1px] before:bg-emerald-500/20">
        {steps.map((step, i) => (
          <div key={i} className="relative flex items-start gap-6 group">
            <div className="z-10 w-14 h-14 shrink-0 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:border-emerald-500 transition-all active:scale-90">
              {step.icon}
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Step 0{i + 1}</h3>
              <p className="text-xs font-black uppercase text-white tracking-tight">{step.title}</p>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1 italic">"{step.desc}"</p>
            </div>
          </div>
        ))}
      </div>

      {/* 4. REFERRAL SYSTEM CARD */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-[32px] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative overflow-hidden group border border-white/5 active:scale-[0.98] transition-all">
        <div className="absolute -right-4 -top-4 opacity-20 rotate-12 group-hover:rotate-0 transition-transform duration-700">
          <Share2 size={120} />
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-yellow-300 fill-yellow-300 animate-pulse" />
            <h2 className="text-lg font-black italic uppercase tracking-tight text-white">Referral Protocol</h2>
          </div>
          
          <p className="text-[11px] font-bold text-emerald-100 leading-snug">
            Unlock infinite <span className="text-white underline underline-offset-4">WR Credits</span> by inviting your allies to the network.
          </p>

          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between shadow-inner">
            <div className="text-center">
              <p className="text-[8px] font-black text-emerald-300 uppercase tracking-widest opacity-70">You Get</p>
              <p className="text-xl font-black text-white">+5 WR</p>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="text-center">
              <p className="text-[8px] font-black text-emerald-300 uppercase tracking-widest opacity-70">Friend Gets</p>
              <p className="text-xl font-black text-white">+5 WR</p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. FUTURE FEATURES NOTE */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 shrink-0 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500">
          <CheckCircle2 size={20} />
        </div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white">More to Come</h4>
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter mt-0.5">Additional modules will be deployed soon for unlimited rewards.</p>
        </div>
      </div>

    </div>
  )
}