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


  // === AUTO CLOSE MENU SAAT SCROLL ===
useEffect(() => {
  const handleScroll = () => {
    if (isMenuOpen) setIsMenuOpen(false)
  }

  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [isMenuOpen])


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
    setIsMenuOpen(false)
    setShowAbout(true)
  }

  const handleGoToContactUs = () => {
  setIsMenuOpen(false)
  setShowContactUs(true)
}

  return (
    <>
      <header className="sticky top-0 z-50 bg-gray-900 text-white px-6 py-4 shadow flex justify-between items-center">
        <div className="flex items-center gap-3 select-none">
          <h1 className="text-xl font-bold tracking-wide">Dashboard</h1>
        </div>

        {status === 'authenticated' && (
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="User menu"
              className="p-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring focus:ring-blue-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                />
              </svg>
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 mt-3 w-64 bg-white text-gray-800 rounded-md shadow-lg overflow-hidden animate-fade-in-up"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 truncate">{username}</p>
                  <p className="text-xs text-green-600 uppercase">{role || 'No role'}</p>
                </div>

                <ul className="divide-y divide-gray-200 text-sm">
                  {/* --- Refresh button --- */}
                  <li className="px-4 py-2">
                    <button
                      onClick={handleRefresh}
                      disabled={!canRefresh}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md hover:bg-gray-100 transition ${
                        !canRefresh ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {refreshing && <span className="animate-spin">⏳</span>}
                      Refresh
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 4v6h6M20 20v-6h-6M4 10a8 8 0 1116 0 8 8 0 01-16 0z"
                        />
                      </svg>
                    </button>
                  </li>

                  {/* --- Main balance --- */}
                  <li className="flex justify-between items-center px-4 py-2">
                    <span>Main balance</span>
                    <span className="font-medium">{mainBalance !== null ? `${mainBalance} WR` : '—'}</span>
                  </li>

                  {/* --- Choose Role --- */}

                  <li>
                    <button
                      onClick={() => router.push('/home')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition"
                    >
                      Choose role
                    </button>
                  </li>


                  {/* --- Notification --- */}
                  <li>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition flex justify-between items-center"
                      onClick={() => setShowNotificationsModal(true)}
                    >
                      Notification
                      {unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </li>

                  <li>
  <button
    onClick={handleGoToContactUs}
    className="w-full text-left px-4 py-2 hover:bg-gray-100 transition"
  >
    Contact us
  </button>
</li>


                  <li>
                    <button
                      onClick={handleGoToAbout}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition"
                    >
                      About
                    </button>
                  </li>

                  <li className="px-4 py-2">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className={`w-full text-left font-medium text-red-600 hover:text-red-700 transition ${
                        isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
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

      {/* ✅ Contact Us Modal */}
{showContactUs && <ContactUsModal onClose={() => setShowContactUs(false)} />}

      {/* --- Notification Modal --- */}
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
      className={`px-4 py-2 border-b last:border-b-0 cursor-pointer ${
        n.isRead ? 'bg-white text-gray-800' : 'bg-gray-100 font-medium text-gray-900'
      } hover:bg-gray-200 transition`}
    >
      {/* 📨 Pesan utama */}
      <p className="text-sm">{n.message}</p>
      <p className="text-xs text-gray-600">{new Date(n.createdAt).toLocaleString()}</p>

      {/* 🧾 Opsional: tampilkan link explorer kalau metadata ada */}
      {n.metadata?.txLink && (
        <a
          href={n.metadata.txLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()} // biar klik link tidak men-trigger markAsRead
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