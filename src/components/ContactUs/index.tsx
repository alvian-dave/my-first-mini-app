'use client'

import { X, Globe, Send, Users, Twitter, Zap } from 'lucide-react'

interface ContactUsModalProps {
  onClose: () => void
}

const SHOW_WEBSITE = false

const CONTACT_LINKS = [
  ...(SHOW_WEBSITE
    ? [{
        icon: <Globe className="w-5 h-5" />,
        label: 'Official Core',
        url: 'https://worldrewardcoin.site',
        color: 'text-emerald-400',
        borderColor: 'group-hover:border-emerald-500/50',
      }]
    : []),

  {
    icon: <Send className="w-5 h-5" />,
    label: 'Telegram Community',
    url: 'https://t.me/WRC_Community',
    color: 'text-sky-400',
    borderColor: 'group-hover:border-sky-500/50',
  },
  {
    icon: <Users className="w-5 h-5" />,
    label: 'Neural Channel',
    url: 'https://t.me/WRC_OfficialAnn',
    color: 'text-blue-400',
    borderColor: 'group-hover:border-blue-500/50',
  },
  {
    icon: <Twitter className="w-5 h-5" />,
    label: 'X Terminal',
    url: 'https://x.com/wrc_bounty',
    color: 'text-slate-200',
    borderColor: 'group-hover:border-white/50',
  },
]

export default function ContactUsModal({ onClose }: ContactUsModalProps) {
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-[#0f172a]/90 border border-white/10 w-full max-w-sm rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()} 
      >
        
        {/* Header - Cyber Style */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">External Links</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-6 px-1">
            Establish connection with the network:
          </p>
          
          <div className="space-y-3">
            {CONTACT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all duration-300 ${link.borderColor}`}
              >
                <div className={`shrink-0 transition-transform group-hover:scale-110 duration-300 ${link.color}`}>
                  {link.icon}
                </div>
                
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[11px] font-black text-white uppercase tracking-wider truncate">
                    {link.label}
                  </span>
                  <span className="text-[9px] font-medium text-slate-500 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {link.url.replace('https://', '')}
                  </span>
                </div>
                
                <div className={`text-xs ${link.color} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all`}>
                  <Zap className="w-3 h-3 fill-current" />
                </div>
              </a>
            ))}
          </div>

          {/* Footer Decoration */}
          <div className="mt-8 pt-4 border-t border-white/5 text-center">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">
              Waiting for uplink...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}