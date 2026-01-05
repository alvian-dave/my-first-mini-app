'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getWRCreditBalance } from '@/lib/getWRCreditBalance'

// Ikon Lucide
import { 
  Home, LogOut, Bell, MessageSquare, Info, 
  RefreshCw, Users, CreditCard, ChevronDown, Zap
} from 'lucide-react'

// Dynamic Imports
const AboutModal = dynamic(() => import('@/components/AboutModal'), { ssr: false })
const ContactUsModal = dynamic(() => import('@/components/ContactUs'), { ssr: false })

interface NotificationItem {
  _id: string
  message: string
  isRead: boolean
  createdAt: string
  metadata?: { txLink?: string }
}

// ===================================
// ## Komponen Modal Notifikasi (Cyber Redesign with TX Link)
// ===================================
const NotificationsModal = ({ onClose, notifications, markAsRead }: any) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f172a]/90 w-full max-w-md rounded-[24px] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col overflow-hidden max-h-[70vh]">
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/5 bg-white/5">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" /> Neural Alerts
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <span className="text-[10px] font-black border border-white/20 px-2 py-1 rounded-md">ESC</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {notifications.length > 0 ? (
            notifications.map((n: NotificationItem) => (
              <div
                key={n._id}
                onClick={() => !n.isRead && markAsRead(n._id)}
                className={`px-6 py-5 cursor-pointer border-b border-white/5 transition-all group ${
                  n.isRead ? 'opacity-60' : 'bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <p className="text-sm text-slate-200 leading-relaxed flex-1">{n.message}</p>
                  {!n.isRead && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shadow-[0_0_8px_rgba(16,185,129,1)] shrink-0" />
                  )}
                </div>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-[9px] font-bold text-slate-500 uppercase italic tracking-wider">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                  
                  {/* --- VIEW TX LINK: KEMBALI DI SINI --- */}
                  {n.metadata?.txLink && (
                    <a
                      href={n.metadata.txLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] font-black text-blue-400 hover:bg-blue-500/20 hover:border-blue-400 transition-all uppercase tracking-tighter"
                    >
                      View Tx 🔗
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No active transmissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===================================
// ## Komponen Topbar Utama
// ===================================
export const Topbar = () => {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showContactUs, setShowContactUs] = useState(false)
  const [role, setRole] = useState<string>('')
  const [mainBalance, setMainBalance] = useState<number | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [canRefresh, setCanRefresh] = useState(true)

  const username = useMemo(() => 
    session?.user?.username || session?.user?.walletAddress?.slice(0, 6) || 'Ghost', 
  [session])

  // --- Theme Logic ---
  const isHunter = role.toLowerCase() === 'hunter'
  const themeClass = isHunter ? 'text-emerald-400' : 'text-blue-400'
  const themeBg = isHunter ? 'bg-emerald-600' : 'bg-blue-600'
  const themeGlow = isHunter ? 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'shadow-[0_0_15px_rgba(59,130,246,0.3)]'

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return
    try {
      const [roleRes, bal] = await Promise.all([
        fetch('/api/roles/get'),
        getWRCreditBalance(session.user.walletAddress!)
      ])
      const roleData = await roleRes.json()
      const activeRole = roleData.activeRole?.toLowerCase() || ''
      setRole(activeRole)
      setMainBalance(Number(bal))

      const notifRes = await fetch(`/api/notifications/${session.user.id}?role=${activeRole}`)
      const notifData = await notifRes.json()
      if (notifData.success) {
        setNotifications(notifData.notifications)
        setUnreadCount(notifData.notifications.filter((n: any) => !n.isRead).length)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    }
  }, [session])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRefresh = async () => {
    if (!canRefresh) return
    setRefreshing(true)
    setCanRefresh(false)
    await fetchData()
    setRefreshing(false)
    setTimeout(() => setCanRefresh(true), 10000)
  }

  if (status === 'loading') return <div className="h-14 bg-[#020617] border-b border-white/5 animate-pulse" />

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 h-16 flex items-center justify-between">
        
        {/* LOGO SECTION */}
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => router.push('/')}>
          <div className={`p-2 rounded-xl bg-slate-900 border border-white/10 group-hover:border-white/20 transition-all ${themeGlow}`}>
            <Home className={`w-5 h-5 ${themeClass}`} strokeWidth={2.5} />
          </div>
          <span className="hidden sm:block text-sm font-black italic uppercase tracking-tighter text-white">
            Cyber<span className={themeClass}>Core</span>
          </span>
        </div>

        {/* ACTIONS SECTION */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* Refresh Action */}
          <button
            onClick={handleRefresh}
            disabled={!canRefresh || refreshing}
            className={`p-2 rounded-lg transition-all ${!canRefresh ? 'opacity-30' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Notifications Action */}
          <button
            onClick={() => setShowNotificationsModal(true)}
            className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${isHunter ? 'bg-emerald-500' : 'bg-blue-500'} animate-ping`} />
            )}
          </button>

          {/* Vertical Divider */}
          <div className="h-6 w-[1px] bg-white/10 mx-1" />

          {/* USER PROFILE DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-3 p-1 pl-3 rounded-full bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all active:scale-95"
            >
              <div className="flex flex-col items-end leading-none">
                <span className="text-[10px] font-black text-white uppercase tracking-tighter">{username}</span>
                <span className={`text-[8px] font-bold uppercase tracking-widest ${themeClass}`}>
                  {role || 'Initializing...'}
                </span>
              </div>
              <div className={`w-8 h-8 ${themeBg} rounded-full flex items-center justify-center shadow-lg border-2 border-[#020617]`}>
                <span className="text-xs font-black text-white">{username[0].toUpperCase()}</span>
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-500 mr-2 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* DROPDOWN MENU (Glassmorphism) */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-4 w-64 bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-5 border-b border-white/5 bg-white/5 flex items-center gap-3">
                  <div className={`w-10 h-10 ${themeBg} rounded-xl flex items-center justify-center shrink-0`}>
                    <Zap className="w-5 h-5 text-white" fill="currentColor" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Current Balance</p>
                    <p className="text-lg font-black text-white truncate leading-none italic">
                      {mainBalance?.toFixed(2)} <span className="text-[10px] text-slate-500 not-italic">WR</span>
                    </p>
                  </div>
                </div>

                <div className="p-2">
                  <MenuButton 
                    icon={<Users className="w-4 h-4" />} 
                    label="Switch Role" 
                    onClick={() => { router.push('/home'); setIsMenuOpen(false); }}
                  />
                  <MenuButton 
                    icon={<MessageSquare className="w-4 h-4" />} 
                    label="Contact Support" 
                    onClick={() => { setShowContactUs(true); setIsMenuOpen(false); }}
                  />
                  <MenuButton 
                    icon={<Info className="w-4 h-4" />} 
                    label="System Info" 
                    onClick={() => { setShowAbout(true); setIsMenuOpen(false); }}
                  />
                  
                  <div className="h-px bg-white/5 my-2 mx-3" />
                  
                  <button
                    onClick={() => signOut({ callbackUrl: '/home' })}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
                  >
                    <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Terminate Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MODALS */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showContactUs && <ContactUsModal onClose={() => setShowContactUs(false)} />}
      {showNotificationsModal && (
        <NotificationsModal 
          onClose={() => setShowNotificationsModal(false)}
          notifications={notifications}
          markAsRead={async (id: string) => {
            await fetch(`/api/notifications/${session?.user?.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ id }),
            })
            fetchData()
          }}
        />
      )}
    </>
  )
}

// Sub-component for Menu Item
const MenuButton = ({ icon, label, onClick }: { icon: any, label: string, onClick: any }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
  >
    <span className="text-slate-500">{icon}</span>
    <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
  </button>
)