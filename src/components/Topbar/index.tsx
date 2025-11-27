'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getWRCreditBalance } from '@/lib/getWRCreditBalance'

const AboutModal = dynamic(() => import('@/components/AboutModal'), { ssr: false })
const ContactUsModal = dynamic(() => import('@/components/ContactUs'), { ssr: false })

export const Topbar = () => {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  // reuse isMenuOpen as PROFILE dropdown open state (keeps original variable usage)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showContactUs, setShowContactUs] = useState(false)
  const [role, setRole] = useState('')
  const [mainBalance, setMainBalance] = useState<number | null>(null)

  // --- Notification state ---
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)

  // --- Refresh state ---
  const [refreshing, setRefreshing] = useState(false)
  const [canRefresh, setCanRefresh] = useState(true)

  const username =
    session?.user?.username ||
    session?.user?.walletAddress?.split('@')[0] ||
    'Unknown User'

  // --- Fetch functions ---
  const fetchBalance = async () => {
    const walletAddress = session?.user?.walletAddress
    if (!walletAddress) return

    try {
      const balance = await getWRCreditBalance(walletAddress)
      setMainBalance(balance)
    } catch (err) {
      console.error('❌ Failed to fetch WRCredit balance:', err)
      setMainBalance(0)
    }
  }

  const fetchNotifications = async (userRole?: string) => {
    if (!session?.user?.id) return
    const r = userRole || role
    if (!r) return
    try {
      const res = await fetch(`/api/notifications/${session.user.id}?role=${r}`)
      const data = await res.json()
      if (data.success && data.notifications) {
        setNotifications(data.notifications)
        const unread = data.notifications.filter((n: any) => !n.isRead).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }

  const handleRefresh = async () => {
    if (!canRefresh) return
    setRefreshing(true)
    setCanRefresh(false)
    await Promise.all([fetchBalance(), fetchNotifications()])
    setRefreshing(false)
    setTimeout(() => setCanRefresh(true), 10000) // enable after 10s
  }

  // --- Initial fetch ---
  useEffect(() => {
    if (!session?.user?.id) return

    const init = async () => {
      try {
        // --- fetch role ---
        const res = await fetch('/api/roles/get')
        const data = await res.json()
        const activeRole = data.success && data.activeRole ? data.activeRole : ''
        setRole(activeRole)

        // --- fetch balance ---
        await fetchBalance()

        // --- fetch notifications langsung pakai role terbaru ---
        if (activeRole) await fetchNotifications(activeRole)
      } catch (err) {
        console.error('Failed initial fetch:', err)
      }
    }

    init()
  }, [session])

  // === AUTO CLOSE MENU ===
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
      const data = await res.json()
      if (!data.success) throw new Error('Failed to update notification')
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      fetchNotifications()
    }
  }

  // --- Logout ---
  const handleLogout = async () => {
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

  const handleGoToAbout = () => {
    // close dropdown first
    setIsMenuOpen(false)
    setShowAbout(true)
  }

  const handleGoToContactUs = () => {
    setIsMenuOpen(false)
    setShowContactUs(true)
  }

  const [isNavigating, setIsNavigating] = useState(false)

  const handleChooseRole = () => {
    setIsNavigating(true)
    router.push('/home')
    setTimeout(() => setIsNavigating(false), 2000)
  }

  // helper: open notifications modal (close profile dropdown first)
  const openNotifications = () => {
    setIsMenuOpen(false)
    setShowNotificationsModal(true)
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-gray-900 text-white px-4 py-3 shadow flex items-center justify-between">
        {/* LEFT: Home (icon + optional label on larger screens) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            aria-label="Home"
            className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-800 focus:outline-none"
            title="Home"
          >
            {/* home svg */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75l9-7.5 9 7.5M4.5 10.5v9.75h5.25V15h4.5v5.25H19.5V10.5" />
            </svg>
            <span className="hidden sm:inline text-lg font-semibold tracking-wide">Dashboard</span>
          </button>
        </div>

        {/* CENTER: keep empty so layout stays single-line and balanced */}
        <div className="flex-1" />

        {/* RIGHT: Icons + profile */}
        {status === 'authenticated' && (
          <div className="relative flex items-center gap-2">
            {/* LOGOUT ICON (to the left of profile) */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 rounded-md hover:bg-gray-800 focus:outline-none"
              title="Logout"
            >
              {/* logout svg */}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
              </svg>
            </button>

            {/* NOTIFICATION ICON (single) */}
            <button
              onClick={openNotifications}
              className="relative p-2 rounded-md hover:bg-gray-800 focus:outline-none"
              title="Notifications"
            >
              {/* bell svg */}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* CONTACT US ICON */}
            <button
              onClick={() => { setShowContactUs(true); setIsMenuOpen(false) }}
              className="p-2 rounded-md hover:bg-gray-800 focus:outline-none"
              title="Contact us"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 6-9 11-9 11s-9-5-9-11a9 9 0 1118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01" />
              </svg>
            </button>

            {/* ABOUT ICON */}
            <button
              onClick={() => { setShowAbout(true); setIsMenuOpen(false) }}
              className="p-2 rounded-md hover:bg-gray-800 focus:outline-none"
              title="About"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </button>

            {/* PROFILE BUTTON (id kept as topbar-button to match original click-outside logic) */}
            <button
              id="topbar-button"
              onClick={() => {
                // toggle profile dropdown and ensure notifications modal closed
                setShowNotificationsModal(false)
                setIsMenuOpen((s) => !s)
              }}
              aria-label="User menu"
              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-800 focus:outline-none"
              title="Profile"
            >
              <div className="hidden sm:flex flex-col text-right leading-tight">
                <span className="text-sm font-semibold truncate max-w-[140px]">{username}</span>
                <span className="text-xs text-green-400 uppercase truncate">{role || 'No role'}</span>
              </div>
              <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center font-bold uppercase text-sm">
                {username?.[0] || 'U'}
              </div>
            </button>

            {/* PROFILE DROPDOWN (id kept topbar-menu to match original click-outside logic) */}
            {isMenuOpen && (
              <div
                id="topbar-menu"
                className="absolute right-0 mt-3 w-72 bg-white text-gray-800 rounded-md shadow-lg overflow-hidden z-50"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 truncate">{username}</p>
                  <p className="text-xs text-green-600 uppercase">{role || 'No role'}</p>
                </div>

                <ul className="divide-y divide-gray-200 text-sm bg-white">
                  {/* Refresh button */}
                  <li className="px-4 py-2">
                    <button
                      onClick={async () => { await handleRefresh(); }}
                      disabled={!canRefresh}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md hover:bg-gray-50 transition ${!canRefresh ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {refreshing && <span className="animate-spin">⏳</span>}
                      Refresh
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6" />
                      </svg>
                    </button>
                  </li>

                  {/* Main balance */}
                  <li className="flex justify-between items-center px-4 py-2">
                    <span>Main balance</span>
                    <span className="font-medium">{mainBalance !== null ? `${mainBalance} WR` : '—'}</span>
                  </li>

                  {/* Choose role (with two-arrows icon) */}
                  <li>
                    <button
                      onClick={handleChooseRole}
                      disabled={isNavigating}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition flex items-center gap-2 ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {/* chevrons left-right */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l-3 3 3 3M17 7l3 3-3 3M10 12h4" />
                      </svg>
                      {isNavigating ? 'Loading…' : 'Choose role'}
                    </button>
                  </li>

                  {/* Notification (entry also available here but icon triggers main modal) */}
                  <li>
                    <button
                      onClick={() => { setIsMenuOpen(false); setShowNotificationsModal(true) }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition flex justify-between items-center"
                    >
                      Notification
                      {unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </li>

                  {/* Contact us */}
                  <li>
                    <button
                      onClick={handleGoToContactUs}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition"
                    >
                      Contact us
                    </button>
                  </li>

                  {/* About */}
                  <li>
                    <button
                      onClick={handleGoToAbout}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition"
                    >
                      About
                    </button>
                  </li>

                  {/* Logout */}
                  <li className="px-4 py-2">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className={`w-full text-left font-medium text-red-600 hover:text-red-700 transition ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isLoggingOut ? 'Logging out…' : 'Logout'}
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </header>

      {/* --- Modals --- */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {showContactUs && <ContactUsModal onClose={() => setShowContactUs(false)} />}

      {/* Notifications Modal (same behavior as original) */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white w-96 max-h-[70vh] rounded-lg shadow-lg flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => markAsRead(n._id)}
                    className={`px-4 py-2 border-b last:border-b-0 cursor-pointer ${n.isRead ? 'bg-white text-gray-800' : 'bg-gray-100 font-medium text-gray-900'} hover:bg-gray-200 transition`}
                  >
                    <p className="text-sm">{n.message}</p>
                    <p className="text-xs text-gray-600">{new Date(n.createdAt).toLocaleString()}</p>

                    {n.metadata?.txLink && (
                      <a
                        href={n.metadata.txLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 text-xs underline mt-1 block hover:text-blue-800"
                      >
                        View on Explorer 🔗
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <p className="px-4 py-2 text-sm text-gray-500 text-center">No notifications yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
