'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getWRCreditBalance } from '@/lib/getWRCreditBalance'

// Menggunakan ikon Lucide/modern
import { Home, LogOut, Bell, MessageSquare, Info, RefreshCw, Users, CreditCard } from 'lucide-react'

// Dynamic Imports untuk Modals
const AboutModal = dynamic(() => import('@/components/AboutModal'), { ssr: false })
const ContactUsModal = dynamic(() => import('@/components/ContactUs'), { ssr: false })

// --- TIPE DATA PENTING ---
interface NotificationItem {
  _id: string
  message: string
  isRead: boolean
  createdAt: string
  metadata?: {
    txLink?: string
  }
}

interface NotificationsModalProps {
  onClose: () => void
  notifications: NotificationItem[]
  markAsRead: (id: string) => Promise<void>
}

// ===================================
// ## Komponen Modal Notifikasi
// ===================================
const NotificationsModal = ({ onClose, notifications, markAsRead }: NotificationsModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div 
        // 1. Container Dark Mode & Mobile Friendly: 
        // Mengganti w-96 dengan w-full max-w-md dan menambahkan mx-4 (margin horizontal)
        className="bg-gray-900 w-full max-w-md mx-4 max-h-[80vh] rounded-xl shadow-2xl flex flex-col transform transition-all animate-in fade-in-0 zoom-in-95 border border-gray-700"
      >
        <div 
          // 2. Header Dark Mode: bg-gray-900, border-gray-700, text-white
          className="flex justify-between items-center px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-900 rounded-t-xl z-10"
        >
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" /> Notifications
          </h2>
          <button
            onClick={onClose}
            // 3. Close Button Dark Mode: text-gray-400, hover:text-white
            className="text-gray-400 hover:text-white p-1 transition-colors rounded-full"
            aria-label="Close notifications"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div 
          // 4. List Divider Dark Mode: divide-gray-700
          className="overflow-y-auto flex-1 divide-y divide-gray-700"
        >
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.isRead && markAsRead(n._id)}
                className={`px-6 py-3 cursor-pointer transition-colors ${
                  n.isRead 
                    // 5. Read Item Dark Mode: bg-gray-900, text-gray-300
                    ? 'bg-gray-900 text-gray-300' 
                    // 6. Unread Item Dark Mode: bg-blue-900/30, hover:bg-blue-900/50, text-white
                    : 'bg-blue-900/30 hover:bg-blue-900/50 font-medium text-white'
                }`}
              >
                <p className="text-sm">{n.message}</p>
                <p className="text-xs text-gray-500 mt-1 flex justify-between items-center">
                  <span className='text-gray-400'>{new Date(n.createdAt).toLocaleString()}</span>
                  {n.metadata?.txLink && (
                    <a
                      href={n.metadata.txLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-400 hover:text-blue-300 underline transition-colors"
                    >
                      View Tx 🔗
                    </a>
                  )}
                </p>
              </div>
            ))
          ) : (
            // 7. No Notifications Dark Mode: text-gray-400
            <p className="px-4 py-8 text-sm text-gray-400 text-center">🎉 All caught up! No new notifications.</p>
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

  // State
  const [isLoggingOut, setIsLoggingOut] = useState(false)
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
  const [isNavigating, setIsNavigating] = useState(false)


  const username: string =
    session?.user?.username ||
    session?.user?.walletAddress?.split('@')[0] ||
    'Unknown User'
  
  // --- Penentuan Warna Dinamis Berdasarkan Role ---
  
  // Fungsi untuk menentukan kelas warna
  const determineAccentColor = (r: string) => {
    const normalizedRole = r.toLowerCase()
    if (normalizedRole === 'hunter') {
      return { name: 'green', class: 'text-green-400', bg: 'bg-green-500', ring: 'focus:ring-green-400', balance: 'text-green-600' }
    }
    if (normalizedRole === 'promoter') {
      return { name: 'blue', class: 'text-blue-400', bg: 'bg-blue-500', ring: 'focus:ring-blue-400', balance: 'text-blue-600' }
    }
    // Default: Gray
    return { name: 'gray', class: 'text-gray-400', bg: 'bg-gray-500', ring: 'focus:ring-gray-400', balance: 'text-gray-600' }
  }

  const { name: accentColor, class: accentColorClass, bg: bgColorClass, ring: ringColorClass, balance: balanceColorClass } = determineAccentColor(role)


  // --- Fetch functions menggunakan useCallback ---
  const fetchBalance = useCallback(async () => {
    const walletAddress = session?.user?.walletAddress
    if (!walletAddress) return

    try {
      // Format angka
      const balance: number = await getWRCreditBalance(walletAddress)
      setMainBalance(parseFloat(balance.toFixed(2))) 
    } catch (err) {
      console.error('❌ Failed to fetch WRCredit balance:', err)
      setMainBalance(0)
    }
  }, [session?.user?.walletAddress])

  const fetchNotifications = useCallback(async (userRole?: string) => {
    if (!session?.user?.id) return
    const r = userRole || role
    if (!r) return
    try {
      const res = await fetch(`/api/notifications/${session.user.id}?role=${r}`)
      const data: { success: boolean, notifications?: NotificationItem[] } = await res.json()
      if (data.success && data.notifications) {
        setNotifications(data.notifications)
        const unread = data.notifications.filter((n: NotificationItem) => !n.isRead).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }, [session?.user?.id, role])

  const handleRefresh = async () => {
    if (!canRefresh) return
    setRefreshing(true)
    setCanRefresh(false)
    await Promise.all([fetchBalance(), fetchNotifications()])
    setRefreshing(false)
    setTimeout(() => setCanRefresh(true), 10000) // Re-enable after 10 seconds
  }

  // --- Initial fetch (Role, Balance, Notifications) ---
  useEffect(() => {
    if (!session?.user?.id) return

    const init = async () => {
      try {
        // Fetch role first
        const res = await fetch('/api/roles/get')
        const data: { success: boolean, activeRole?: string } = await res.json()
        
        // PASTIKAN ROLE SELALU DIUBAH KE HURUF KECIL
        const activeRole = data.success && data.activeRole ? data.activeRole.toLowerCase() : ''
        
        setRole(activeRole)

        // Fetch other data
        await fetchBalance()
        if (activeRole) await fetchNotifications(activeRole)
      } catch (err) {
        console.error('Failed initial fetch:', err)
      }
    }

    init()
  }, [session, fetchBalance, fetchNotifications])

  // === AUTO CLOSE MENU on Scroll / Click Outside ===
  useEffect(() => {
    const container = document.getElementById('app-scroll')
    const closeProfile = () => setIsMenuOpen(false)

    if (container) container.addEventListener('scroll', closeProfile)

    const handleClickOutside = (e: MouseEvent) => {
      const menu = document.getElementById('topbar-menu')
      const button = document.getElementById('topbar-button')
      if (menu && button && !menu.contains(e.target as Node) && !button.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      if (container) container.removeEventListener('scroll', closeProfile)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // --- Notification mark as read ---
  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    )
    setUnreadCount((prev) => Math.max(prev - 1, 0))

    try {
      const res = await fetch(`/api/notifications/${session?.user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data: { success: boolean } = await res.json()
      if (!data.success) throw new Error('Failed to update notification')
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      // Revert or re-fetch on failure
      fetchNotifications()
    }
  }

  // --- Handlers ---
  const handleLogout = async () => {
    setIsMenuOpen(false)
    setIsLoggingOut(true)
    try {
      await signOut({ redirect: false })
      router.push('/home')
    } catch (err) {
      console.error('❌ Logout failed:', err)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleChooseRole = () => {
    setIsMenuOpen(false)
    setIsNavigating(true)
    router.push('/home')
    setTimeout(() => setIsNavigating(false), 2000)
  }

  const openNotificationsModal = () => {
    setIsMenuOpen(false)
    setShowNotificationsModal(true)
  }

  const openAboutModal = () => {
    setIsMenuOpen(false)
    setShowAbout(true)
  }

  const openContactUsModal = () => {
    setIsMenuOpen(false)
    setShowContactUs(true)
  }


  return (
    <>
      <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-700 shadow-lg text-white px-4 py-2 flex items-center justify-between h-14">
        
        {/* KIRI: Logo/Home */}
        <button
          aria-label="Home Dashboard"
          className={`flex items-center gap-2 p-2 rounded-md transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 ${ringColorClass}`}
          title="Dashboard"
        >
          {/* Warna Ikon Home dinamis */}
          <Home className={`w-5 h-5 ${accentColorClass} flex-shrink-0`} /> 
          <span className="hidden sm:inline text-lg font-bold tracking-tight text-white">App Name</span>
        </button>

        {/* TENGAH: Kosong untuk centering */}
        <div className="flex-1" />

        {/* KANAN: Ikon Aksi + Profil */}
        {status === 'authenticated' && (
          <div className="relative flex items-center gap-1">

            {/* REFRESH BUTTON */}
            <button
              onClick={handleRefresh}
              disabled={!canRefresh || refreshing}
              className={`p-2 rounded-full transition-colors ${
                !canRefresh || refreshing
                  ? 'text-gray-500 cursor-not-allowed'
                  : `hover:bg-gray-800 text-gray-300 hover:text-white`
              } focus:outline-none focus:ring-2 ${ringColorClass}`}
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* NOTIFICATION ICON */}
            <button
              onClick={openNotificationsModal}
              className={`relative p-2 rounded-full transition-colors hover:bg-gray-800 text-gray-300 hover:text-white focus:outline-none focus:ring-2 ${ringColorClass}`}
              title={`Notifications (${unreadCount} unread)`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 border-2 border-gray-900 rounded-full transform translate-x-1/4 -translate-y-1/4">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* CONTACT US ICON (Desktop Only) */}
            <button
              onClick={openContactUsModal}
              className={`p-2 rounded-full transition-colors hover:bg-gray-800 text-gray-300 hover:text-white focus:outline-none focus:ring-2 ${ringColorClass} hidden md:block`}
              title="Contact Us"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* ABOUT ICON (Desktop Only) */}
            <button
              onClick={openAboutModal}
              className={`p-2 rounded-full transition-colors hover:bg-gray-800 text-gray-300 hover:text-white focus:outline-none focus:ring-2 ${ringColorClass} hidden md:block`}
              title="About"
            >
              <Info className="w-5 h-5" />
            </button>


            {/* PROFILE BUTTON & DROPDOWN TRIGGER */}
            <button
              id="topbar-button"
              onClick={() => {
                setShowNotificationsModal(false)
                setIsMenuOpen((s) => !s)
              }}
              aria-label="User menu"
              className={`ml-2 flex items-center gap-2 p-1.5 rounded-full transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 ${ringColorClass}`}
              title="Profile Menu"
            >
              {/* Background Avatar/Circle dinamis */}
              <div className={`w-9 h-9 ${bgColorClass} rounded-full flex items-center justify-center font-semibold text-white text-sm`}>
                {username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden lg:flex flex-col text-left leading-tight pr-1">
                <span className="text-sm font-medium truncate max-w-[120px] text-white">{username}</span>
                {/* Warna Role di Topbar dinamis */}
                <span className={`text-xs ${accentColorClass} uppercase font-medium`}>{role || 'No role'}</span> 
              </div>
            </button>

            {/* PROFILE DROPDOWN */}
            {isMenuOpen && (
                <div
                  id="topbar-menu"
                  className="absolute right-0 top-full mt-2 w-64 bg-white text-gray-800 rounded-lg shadow-2xl border border-gray-100 z-50 transition-all duration-200 origin-top-right scale-100 opacity-100"
                  onMouseLeave={() => setIsMenuOpen(false)}
                >
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-bold text-gray-900 truncate">{username}</p>
                    {/* Warna Role di Dropdown dinamis */}
                    <p className={`text-xs ${balanceColorClass} uppercase font-medium`}>{role || 'No role'}</p>
                  </div>

                  <ul className="text-sm">
                    {/* --- Main balance (Credit) --- */}
                    <li className="flex justify-between items-center px-4 py-2 hover:bg-gray-50 transition-colors">
                      <div className='flex items-center gap-3 text-gray-600'>
                        <CreditCard className='w-4 h-4'/>
                        <span>Main Balance</span>
                      </div>
                      {/* Warna Saldo dinamis */}
                      <span className={`font-semibold ${balanceColorClass}`}>
                        {mainBalance !== null ? `${mainBalance.toFixed(2)} WR` : '—'}
                      </span>
                    </li>
                      <li className="h-px bg-gray-100 my-1"/>

                    {/* --- Choose Role --- */}
                    <li>
                      <button
                        onClick={handleChooseRole}
                        disabled={isNavigating}
                        className={`w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors ${
                          isNavigating ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Users className='w-4 h-4 text-gray-600'/>
                        {isNavigating ? 'Switching Role…' : 'Switch Role'}
                      </button>
                    </li>

                    {/* --- Contact Us (Mobile View) --- */}
                    <li>
                      <button
                        onClick={openContactUsModal}
                        className="md:hidden w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors"
                      >
                        <MessageSquare className='w-4 h-4 text-gray-600'/>
                        Contact Us
                      </button>
                    </li>

                    {/* --- About (Mobile View) --- */}
                    <li>
                      <button
                        onClick={openAboutModal}
                        className="md:hidden w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors"
                      >
                        <Info className='w-4 h-4 text-gray-600'/>
                        About
                      </button>
                    </li>

                    {/* --- Logout --- */}
                    <li className="border-t border-gray-100 mt-1">
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className={`w-full text-left flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors ${
                          isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <LogOut className='w-4 h-4'/>
                        {isLoggingOut ? 'Logging Out...' : 'Log Out'}
                      </button>
                    </li>
                  </ul>
                </div>
            )}
          </div>
        )}
        {/* Tampilkan Loading/Skeleton jika status loading */}
        {status === 'loading' && (
          <div className="animate-pulse flex items-center gap-2">
            <div className="w-24 h-4 bg-gray-600 rounded"></div>
            <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
          </div>
        )}
      </header>

      {/* --- Modals --- */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showContactUs && <ContactUsModal onClose={() => setShowContactUs(false)} />}
      
      {/* Notifications Modal */}
      {showNotificationsModal && (
        <NotificationsModal 
          onClose={() => setShowNotificationsModal(false)}
          notifications={notifications}
          markAsRead={markAsRead}
        />
      )}
    </>
  )
}