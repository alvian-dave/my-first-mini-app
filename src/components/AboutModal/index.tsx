'use client'

import { X, Trophy, DollarSign, Zap, ShieldCheck, Cpu, Globe, Activity } from 'lucide-react'

interface AboutModalProps {
  onClose: () => void
}

/**
 * ## AboutModal - Cyber-Noir Edition
 * Desain serempak dengan Topbar dan ContactUs menggunakan Glassmorphism dan Bold Typography.
 */
export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-[#0f172a]/95 border border-white/10 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-lg w-full overflow-hidden transform transition-all relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header - Terminal Style */}
        <div className="px-8 pt-8 pb-5 border-b border-white/5 bg-white/5 relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Trophy size={24} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Protocol Information</h2>
              <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                About WR <span className="text-emerald-400">Bounty</span>
              </h1>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <Badge text="Transparent" color="text-emerald-400" />
            <Badge text="Non-Custodial" color="text-blue-400" />
            <Badge text="Automated" color="text-purple-400" />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">

          {/* Platform Overview */}
          <section className="relative group">
            <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 mb-3">
              <Cpu size={14} /> System Core
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              <span className="text-white">WR Bounty</span> is a decentralized tactical layer built on 
              <span className="text-white"> World Chain</span>. It facilitates direct transmission between 
              <span className="text-slate-400 italic"> Promoters</span> and 
              <span className="text-emerald-400 italic font-bold"> Hunters</span> through secure, 
              automated neural-contracts.
            </p>
          </section>

          {/* WR Credit Logic */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
              <Activity size={14} /> Operational Credits (WR)
            </h3>
            
            <div className="grid gap-3">
              <Card 
                label="Promoter Deployment" 
                desc="Fund campaigns using USDC.e at a fixed sync rate (1 USDC = 200 WR)."
                icon={<DollarSign size={16} className="text-blue-400" />}
              />
              <Card 
                label="Hunter Extraction" 
                desc="Earn WR by executing verified digital tasks with surgical precision."
                icon={<Zap size={16} className="text-emerald-400" />}
              />
            </div>
          </section>

          {/* Legal/Important Notice - Cyber Guard Style */}
          <section className="bg-emerald-500/[0.03] border border-emerald-500/10 p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <ShieldCheck size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
              <ShieldCheck size={14} /> Compliance Protocol
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              WR Credits are <span className="text-emerald-200">Utility Metrics</span> only. They do not constitute financial instruments or ownership. Future parity or integration within the WRC ecosystem is subject to active governance and participation eligibility.
            </p>
          </section>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-3">
            <MiniStat title="Trustless" icon="⚙️" />
            <MiniStat title="Pre-Funded" icon="💵" />
            <MiniStat title="Low-Gas" icon="🌍" />
            <MiniStat title="Instant" icon="⚡" />
          </div>

          <div className="text-center pt-8 opacity-30">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">
              System Version 1.0.0 // Connected to World Chain
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Internal Sub-components ---

const Badge = ({ text, color }: { text: string; color: string }) => (
  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-white/5 border border-white/10 rounded-md ${color}`}>
    {text}
  </span>
)

const Card = ({ label, desc, icon }: { label: string; desc: string; icon: any }) => (
  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl hover:bg-white/[0.05] transition-colors">
    <div className="flex items-center gap-3 mb-1">
      {icon}
      <span className="text-[11px] font-black text-white uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-xs text-slate-500 leading-snug pl-7">{desc}</p>
  </div>
)

const MiniStat = ({ title, icon }: { title: string; icon: string }) => (
  <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center gap-3">
    <span className="text-lg">{icon}</span>
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
  </div>
)

const MiniStatGroup = () => {} // Placeholder