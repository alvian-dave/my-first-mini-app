'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  Wallet, 
  Terminal, 
  ShieldCheck, 
  Bot, 
  Rocket, 
  RefreshCcw, 
  LayoutDashboard,
  Zap,
  DollarSign
} from 'lucide-react'

export default function PromoterHowToStart() {
  const router = useRouter()

  const workflow = [
    {
      title: "Credit Acquisition",
      desc: "Deposit WR Credits using USDC. Fixed rate: 1 WR = 0.005 USDC. All campaign fuels and hunter rewards use WR Credits.",
      icon: <DollarSign size={18} />
    },
    {
      title: "Mission Calibration",
      desc: "Define your title, description, and tasks. Minimum reward is 10 WR per Hunter. Ensure task URLs are 100% accurate; our system auto-detects typos.",
      icon: <Terminal size={18} />
    },
    {
      title: "Bot Integration",
      desc: "For Telegram/Discord tasks, you must add WR Bounty Bot as an admin to verify hunter presence and validate actions.",
      icon: <Bot size={18} />
    },
    {
      title: "Escrow Deployment",
      desc: "Upon publishing, a popup will authorize the transfer of WR Credits to our Escrow. Funds are stored securely until verified hunters complete tasks.",
      icon: <ShieldCheck size={18} />
    }
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-white px-4 pb-32 space-y-8 relative">
      
      {/* 1. STICKY TOPBAR - PROMOTER BLUE */}
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
            <span className="block text-[8px] font-black text-blue-500 uppercase tracking-[0.3em]">Campaign</span>
            <span className="text-xs font-black text-white italic uppercase tracking-tighter">Promoter Guide</span>
          </div>
        </div>
      </div>

      {/* 2. HERO HEADER */}
      <div className="pt-2 text-center space-y-2">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">How to <span className="text-blue-500">Scale</span></h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest max-w-[280px] mx-auto">Deploy missions into the neural net and dominate the engagement market.</p>
      </div>

      {/* 3. CORE PROTOCOL STEPS */}
      <div className="space-y-8 relative before:absolute before:left-[27px] before:top-2 before:bottom-2 before:w-[1px] before:bg-blue-500/20">
        {workflow.map((step, i) => (
          <div key={i} className="relative flex items-start gap-6 group">
            <div className="z-10 w-14 h-14 shrink-0 rounded-2xl bg-slate-900 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover:border-blue-500 transition-all">
              {step.icon}
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-1">Phase 0{i + 1}</h3>
              <p className="text-xs font-black text-white uppercase tracking-tight">{step.title}</p>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1 italic italic">"{step.desc}"</p>
            </div>
          </div>
        ))}
      </div>

      {/* 4. TECHNICAL RULES CARD */}
      <div className="bg-slate-900/50 border border-blue-500/20 rounded-[32px] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Zap size={16} className="text-yellow-400 fill-yellow-400" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Operational Protocol</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <RefreshCcw size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase">
              <span className="text-white font-black">Refill System:</span> Use the <span className="text-blue-400">Finance Page</span> to add WR to active campaigns. Edit mode is limited to Titles and Descriptions only.
            </p>
          </div>
          <div className="flex gap-3">
            <Rocket size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase">
              <span className="text-white font-black">Persistence:</span> Campaigns remain active as long as the <span className="text-blue-400">Remaining Budget</span> covers at least one hunter reward.
            </p>
          </div>
          <div className="flex gap-3">
            <Wallet size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase">
              <span className="text-white font-black">Auto-Refund:</span> Finished or Deleted campaigns automatically return unspent budget to your main wallet balance.
            </p>
          </div>
        </div>
      </div>

{/* 5. LIVE ADS FEATURE */}
      <div className="bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute -right-2 -bottom-2 opacity-5">
           <LayoutDashboard size={100} />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-500 text-[8px] font-black rounded uppercase tracking-widest text-white">Available Now</span>
            <h3 className="text-xs font-black uppercase italic tracking-tighter text-white">Neural Banner Ads</h3>
          </div>
          <p className="text-[10px] font-medium text-slate-400 leading-snug">
            Promote your <span className="text-white">Mini Apps</span> or any custom ads for <span className="text-white">200 WR / 1 USDC per 24H</span>. 
            Banners are displayed at the top of both Hunter and Promoter dashboards, greeting every user upon entry.
          </p>
        </div>
      </div>

    </div>
  )
}