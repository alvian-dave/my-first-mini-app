'use client'

import { useEffect, useState } from 'react'
import { X, Copy, Clock, Users, CheckCircle2, AlertCircle, Award, TrendingUp } from 'lucide-react'

// --- INTERNAL TOAST COMPONENT ---
const LocalToast = ({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`px-6 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 ${
        type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400'
      }`}>
        {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
        <span className="text-xs font-black uppercase tracking-widest">{msg}</span>
      </div>
    </div>
  )
}

type Stats = {
  pending: number
  confirmed: number
  expired: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

const APP_ID = 'app_b7153403a67ed506679d5103a1f6d935'

export default function ReferralModal({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<'referral' | 'stats' | 'rules'>('referral')
  const [myCode, setMyCode] = useState<string | null>(null)
  const [inputCode, setInputCode] = useState('')
  const [alreadyUsed, setAlreadyUsed] = useState(false)
  const [userJoinedAt, setUserJoinedAt] = useState<number | null>(null)
  const [stats, setStats] = useState<Stats>({ pending: 0, confirmed: 0, expired: 0 })
  const [loading, setLoading] = useState(false)
  const [localToast, setLocalToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // 1. LOGIKA PENANGKAP KODE (AUTO-SAVE)
  useEffect(() => {
    // Tangkap kode dari URL saat pertama kali komponen di-mount
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      localStorage.setItem('pending_referral', ref.toUpperCase())
    }
  }, [])

  // 2. LOGIKA FETCH DATA & AUTO-FILL
  useEffect(() => {
    if (!isOpen) return
    
    fetch('/api/referral/me')
      .then(res => res.json())
      .then(data => {
        if (!data?.ok) return
        setMyCode(data.referralCode)
        setAlreadyUsed(data.hasSubmittedReferral)
        setStats(data.stats)
        if (data.userCreatedAt) setUserJoinedAt(new Date(data.userCreatedAt).getTime())
        
        // AUTO-FILL: Ambil dari localStorage jika user belum pernah submit
        const savedRef = localStorage.getItem('pending_referral')
        if (savedRef && !data.hasSubmittedReferral) {
          setInputCode(savedRef)
        }
      })
      .catch(() => setLocalToast({ msg: 'Sync Failed', type: 'error' }))
  }, [isOpen])

  const now = Date.now()
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000
  const isExpired = userJoinedAt ? (now - userJoinedAt > twentyFourHoursInMs) : false
  const isInputLocked = alreadyUsed || isExpired

  const copyToClipboard = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setLocalToast({ msg: msg, type: 'success' })
    } catch (err) {
      setLocalToast({ msg: 'Copy Failed', type: 'error' })
    }
  }

  const submitReferral = async () => {
    if (!inputCode || isInputLocked || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/referral/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputCode.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLocalToast({ msg: data.error || 'Invalid Code', type: 'error' })
        return
      }
      
      // Sukses: Hapus dari storage
      localStorage.removeItem('pending_referral')
      setAlreadyUsed(true)
      setLocalToast({ msg: 'Code Applied!', type: 'success' })
      setStats(prev => ({ ...prev, pending: prev.pending + 1 }))
    } catch (err) {
      setLocalToast({ msg: 'Network Error', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 px-4 backdrop-blur-md transition-all">
      {localToast && <LocalToast msg={localToast.msg} type={localToast.type} onClose={() => setLocalToast(null)} />}

      <div className="w-full max-w-md h-[580px] flex flex-col rounded-[32px] bg-[#0f172a] text-white shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(59,130,246,0.05)]" />

        <div className="relative flex justify-between items-center p-6 border-b border-white/5">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-1">Affiliate Protocol</h2>
            <h3 className="font-black text-2xl italic uppercase tracking-tighter">Referral <span className="text-slate-500">Center</span></h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex bg-white/[0.02] border-b border-white/5">
          {['referral', 'stats', 'rules'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`flex-1 py-4 text-[10px] font-black tracking-[0.2em] transition-all relative ${
                tab === t ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.toUpperCase()}
              {tab === t && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {tab === 'referral' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Activation Code</label>
                  {isExpired && !alreadyUsed && (
                    <span className="text-[9px] font-bold text-red-500 flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                      <Clock size={10} /> 24H EXPIRED
                    </span>
                  )}
                </div>
                
                <input
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value)}
                  disabled={isInputLocked}
                  placeholder={isExpired && !alreadyUsed ? "WINDOW CLOSED" : "ENTER CODE..."}
                  className="w-full h-14 rounded-2xl bg-black/40 px-5 text-sm font-bold border border-white/10 outline-none transition-all focus:border-emerald-500/50 focus:bg-emerald-500/[0.02] disabled:opacity-30 placeholder:text-slate-700 uppercase"
                />

                <button
                  disabled={isInputLocked || loading}
                  onClick={submitReferral}
                  className={`w-full h-14 rounded-2xl font-black text-xs tracking-[0.2em] transition-all active:scale-[0.98] shadow-lg ${
                    isInputLocked
                      ? 'bg-slate-800 text-slate-500 opacity-50'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                  }`}
                >
                  {loading ? 'PROCESSING...' : alreadyUsed ? 'CODE ACTIVATED' : isExpired ? 'TIME EXPIRED' : 'ACTIVATE REWARD'}
                </button>
              </div>

              {/* SHARE SECTION */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Referral Link</p>
                  <div className="flex items-center justify-between bg-black/40 h-12 px-4 rounded-xl border border-white/10">
                    <span className="text-[9px] font-bold truncate text-emerald-400/60 tracking-tight mr-4">
                      {myCode ? `worldcoin.org/mini-app?app_id=...&ref=${myCode}` : 'INITIALIZING...'}
                    </span>
                    <button 
                      onClick={() => myCode && copyToClipboard(`https://worldcoin.org/mini-app?app_id=${APP_ID}&ref=${myCode}&app_mode=mini-app`, 'Link Copied!')}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-all text-emerald-400"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Permanent Referral Code</p>
                  <div className="flex items-center justify-between bg-emerald-500/5 h-12 px-4 rounded-xl border border-emerald-500/20">
                    <span className="text-sm font-black text-white tracking-[0.2em]">
                      {myCode || '---'}
                    </span>
                    <button 
                      onClick={() => myCode && copyToClipboard(myCode, 'Code Copied!')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-[#0f172a] rounded-lg font-black text-[10px] uppercase hover:bg-emerald-400 transition-all active:scale-95"
                    >
                      <Copy size={12} />
                      COPY CODE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB STATS & RULES (SAMA SEPERTI SEBELUMNYA) */}
          {tab === 'stats' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="p-6 rounded-[24px] bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Total Verified Friends</p>
                  <p className="text-4xl font-black italic tracking-tighter">{stats.confirmed}</p>
                </div>
                <Users size={40} className="text-emerald-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 p-5 rounded-[24px] border border-white/5">
                  <div className="flex items-center gap-2 mb-2 text-yellow-500"><TrendingUp size={14} /><span className="text-[9px] font-black uppercase tracking-widest">Pending</span></div>
                  <p className="text-2xl font-black">{stats.pending}</p>
                </div>
                <div className="bg-black/40 p-5 rounded-[24px] border border-white/5">
                  <div className="flex items-center gap-2 mb-2 text-slate-500"><AlertCircle size={14} /><span className="text-[9px] font-black uppercase tracking-widest">Inactive</span></div>
                  <p className="text-2xl font-black text-slate-400">{stats.expired}</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'rules' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="p-5 bg-blue-500/5 rounded-[24px] border border-blue-500/10 flex items-center gap-4">
                <Award className="text-blue-400 flex-shrink-0" size={32} />
                <p className="text-[11px] font-bold text-blue-200 leading-tight">
                  DOUBLE REWARD ACTIVE: You and your friend both receive <span className="text-white text-sm font-black italic">5 WR CREDITS</span> upon verification.
                </p>
              </div>
              <div className="bg-black/40 p-6 rounded-[24px] border border-white/5">
            <ul className="space-y-5">
                    {[
                      { 
                        n: '01', 
                        t: '24-HOUR WINDOW', 
                        d: 'Your referred friend MUST enter your code within 24 hours of their first login.' 
                      },
                      { 
                        n: '02', 
                        t: 'REFERRAL VALIDATION', 
                        d: 'Activation is only valid for new users who haven’t submitted a code yet.' 
                      },
                      { 
                        n: '03', 
                        t: 'INSTANT CREDIT', 
                        d: 'Rewards are distributed instantly after neural confirmation.' 
                      },
                      { 
                        n: '04', 
                        t: 'UNLIMITED MINING', 
                        d: 'There is no limit to how many friends you can invite to the protocol.' 
                      },
                      { 
                        n: '05', 
                        t: 'ANTI-FRAUD', 
                        d: 'Multiple accounts from the same ID or device will result in a permanent ban.' 
                      }
                    ].map(rule => (
                      <li key={rule.n} className="flex gap-4">
                      <span className="text-[10px] font-black text-emerald-500 mt-1">{rule.n}</span>
                      <div><p className="text-[10px] font-black uppercase tracking-widest text-white mb-1">{rule.t}</p><p className="text-[11px] font-medium text-slate-500 leading-snug">{rule.d}</p></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-black/20 text-center border-t border-white/5">
           <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em]">Neural Network v1.0.4</p>
        </div>
      </div>
    </div>
  )
}