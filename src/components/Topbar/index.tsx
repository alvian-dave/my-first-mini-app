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
  const [showProfileMenu, setShowProfileMenu] = useState(false)
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

  // --- Close dropdowns when click outside or scroll ---
  useEffect(() => {
    const container = document.getElementById('app-scroll')

    const closeAll = () => {
      setShowProfileMenu(false)
    }

    if (container) container.addEventListener('scroll', closeAll)

    const handleClickOutside = (e: MouseEvent) => {
      const profile = document.getElementById('topbar-profile-menu')
      const profileBtn = document.getElementById('topbar-profile-btn')
      // if click outside profile menu & profile button -> close profile menu
      if (profile && profileBtn && !profile.contains(e.target as Node) && !profileBtn.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      if (container) container.removeEventListener('scroll', closeAll)
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
    // close any open menus first
    setShowProfileMenu(false)
    setShowAbout(true)
  }

  const handleGoToContactUs = () => {
    setShowProfileMenu(false)
    setShowContactUs(true)
  }

  const [isNavigating, setIsNavigating] = useState(false)

  const handleChooseRole = () => {
    setIsNavigating(true)
    router.push('/home')
    // keep same behavior as before
    setTimeout(() => setIsNavigating(false), 2000)
  }

  // Ensure opening one modal closes others (prevent tabrakan)
  const openNotifications = () => {
    setShowProfileMenu(false)
    setShowNotificationsModal(true)
  }

  const openProfileMenu = () => {
    // close notifications modal if open
    setShowNotificationsModal(false)
    setShowProfileMenu((prev) => !prev)
  }

  return (
    <>
      {/* Topbar: left = home, center = (spare), right = profile */}
      <header className="sticky top-0 z-50 bg-gray-900 text-white px-4 py-3 shadow flex items-center justify-between gap-2">
        {/* LEFT: Home */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/dashboard')}
            aria-label="Home"
            className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-800 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75l9-7.5 9 7.5M4.5 10.5v9.75h5.25V15h4.5v5.25H19.5V10.5" />
            </svg>
            {/* title only shown on larger screens to save space on mobile */}
            <span className="hidden sm:inline text-lg font-semibold tracking-wide">Dashboard</span>
          </button>
        </div>

        {/* CENTER: placeholders for future icons (kept minimal, won't render if none) */}
        <nav className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-6">
            {/* keep empty — avoids accidental assumptions like 'campaign' or 'chat' */}
            {/* If in future you want icons, add here. */}
          </div>
        </nav>

        {/* RIGHT: Profile + quick-info */}
        {status === 'authenticated' && (
          <div className="relative flex items-center gap-2">
            {/* Quick refresh + notifications icons (compact, mobile-friendly) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={!canRefresh}
                className={`p-2 rounded-md hover:bg-gray-800 focus:outline-none ${!canRefresh ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Refresh"
                title="Refresh"
              >
                {refreshing ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M4 10a8 8 0 1116 0 8 8 0 01-16 0z" />
                  </svg>
                )}
              </button>

              <button
                onClick={openNotifications}
                className="relative p-2 rounded-md hover:bg-gray-800 focus:outline-none"
                aria-label="Notifications"
                title="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* PROFILE BUTTON */}
            <button
              id="topbar-profile-btn"
              onClick={openProfileMenu}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-800 focus:outline-none"
              aria-haspopup="true"
              aria-expanded={showProfileMenu}
            >
              <div className="hidden sm:flex flex-col text-right leading-tight">
                <span className="text-sm font-semibold truncate max-w-[140px]">{username}</span>
                <span className="text-xs text-green-400 uppercase truncate">{role || 'No role'}</span>
              </div>
              <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center font-bold uppercase text-sm">
                {username?.[0] || 'U'}
              </div>
            </button>

            {/* PROFILE DROPDOWN */}
            {showProfileMenu && (
              <div
                id="topbar-profile-menu"
                className="absolute right-0 mt-3 w-72 bg-white text-gray-800 rounded-md shadow-lg overflow-hidden z-50"
                role="menu"
                aria-label="Profile menu"
              >
                <div className="px-4 py-3 bg-gray-100 border-b">
                  <p className="text-sm font-semibold truncate">{username}</p>
                  <p className="text-xs text-green-600 uppercase">{role || 'No role'}</p>
                </div>

                <ul className="divide-y divide-gray-200 text-sm bg-white">
                  {/* Main balance */}
                  <li className="flex justify-between items-center px-4 py-2">
                    <span>Main balance</span>
                    <span className="font-medium">{mainBalance !== null ? `${mainBalance} WR` : '—'}</span>
                  </li>

                  {/* Choose role */}
                  <li>
                    <button
                      onClick={handleChooseRole}
                      disabled={isNavigating}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isNavigating ? 'Loading…' : 'Choose role'}
                    </button>
                  </li>

                  {/* Notifications */}
                  <li>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false)
                        setShowNotificationsModal(true)
                      }}
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

                  {/* Contact & About */}
                  <li>
                    <button onClick={handleGoToContactUs} className="w-full text-left px-4 py-2 hover:bg-gray-50 transition">Contact us</button>
                  </li>

                  <li>
                    <button onClick={handleGoToAbout} className="w-full text-left px-4 py-2 hover:bg-gray-50 transition">About</button>
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

      {/* Notifications Modal (full modal, closes profile dropdown first when opened) */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white w-96 max-h-[70vh] rounded-lg shadow-lg flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowNotificationsModal(false)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
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
                        onClick={(e) => e.stopPropagation()} // prevent closing/marking when clicking link
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
