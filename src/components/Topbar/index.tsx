'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const ProfileModal = dynamic(() => import('@/components/ProfileModal'), { ssr: false })
const AboutModal = dynamic(() => import('@/components/AboutModal'), { ssr: false })
const TopupModal = dynamic(() => import('@/components/TopupModal'), { ssr: false })

export const Topbar = () => {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showTopup, setShowTopup] = useState(false)
  const [role, setRole] = useState('')
  const [mainBalance, setMainBalance] = useState<number | null>(null)

  // --- Notification state ---
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)

  const username =
    session?.user?.username ||
    session?.user?.walletAddress?.split('@')[0] ||
    'Unknown User'

  // Fetch activeRole
  useEffect(() => {
    const fetchRole = async () => {
      if (!session?.user?.id) return
      try {
        const res = await fetch('/api/roles/get')
        const data = await res.json()
        if (data.success && data.activeRole) setRole(data.activeRole)
      } catch (err) {
        console.error('Failed to fetch activeRole:', err)
      }
    }
    fetchRole()
  }, [session])

  // Fetch main balance
  const fetchBalance = async () => {
    if (!session?.user?.id) return
    try {
      const res = await fetch(`/api/balance/${session.user.id}`)
      const data = await res.json()
      if (data.success && data.balance) setMainBalance(data.balance.amount ?? 0)
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [session])

  // Poll balance every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBalance()
    }, 5000)
    return () => clearInterval(interval)
  }, [session])

  // --- Notification functions ---
  const fetchNotifications = async () => {
    if (!session?.user?.id || !role) return
    try {
      const res = await fetch(`/api/notifications/${session.user.id}?role=${role}`)
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

  useEffect(() => {
    fetchNotifications()
  }, [session, role])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications()
    }, 10000) // polling setiap 10 detik
    return () => clearInterval(interval)
  }, [session, role])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${session?.user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      fetchNotifications()
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  // Logout
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

  const handleGoToProfile = () => {
    setIsMenuOpen(false)
    setShowProfile(true)
  }

  const handleGoToAbout = () => {
    setIsMenuOpen(false)
    setShowAbout(true)
  }

  const handleGoToTopup = () => {
    setIsMenuOpen(false)
    setShowTopup(true)
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-gray-900 text-white px-6 py-4 shadow flex justify-between items-center">
        <div className="flex items-center gap-3 select-none">
          <img src="/logo.png" alt="Logo" className="w-8 h-8" />
          <h1 className="text-xl font-bold tracking-wide">World Reward</h1>
        </div>

        {status === 'authenticated' && (
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="User menu"
              className="p-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring focus:ring-blue-500"
            >
              {/* menu icon */}
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
                  <li className="flex justify-between items-center px-4 py-2">
                    <span>Main balance</span>
                    <span className="font-medium">{mainBalance !== null ? `${mainBalance} WR` : '—'}</span>
                  </li>

                  <li>
                    <button
                      onClick={handleGoToProfile}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition"
                    >
                      Profile
                    </button>
                  </li>

                  <li>
                    <button
                      onClick={handleGoToTopup}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition"
                    >
                      Top-up
                    </button>
                  </li>

                  {/* Notification button */}
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
                    <a
                      href="https://t.me/WRC_Community"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 hover:bg-gray-100 transition"
                    >
                      Contact us
                    </a>
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
{showProfile && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white w-96 max-h-[80vh] overflow-y-auto rounded-lg shadow-lg p-4">
      <ProfileModal onClose={() => setShowProfile(false)} />
    </div>
  </div>
)}

{showAbout && (
  <AboutModal onClose={() => setShowAbout(false)} />
)}

{showTopup && session?.user?.id && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white w-96 max-h-[80vh] overflow-y-auto rounded-lg shadow-lg p-4">
      <TopupModal 
        onClose={() => setShowTopup(false)} 
        userId={session.user.id} 
        onSuccess={() => fetchBalance()} 
      />
    </div>
  </div>
)}

{/* --- Notification Modal --- */}
{showNotificationsModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white w-96 max-h-[70vh] rounded-lg shadow-lg flex flex-col">
      {/* Header sticky */}
      <div className="flex justify-between items-center px-4 py-3 border-b sticky top-0 bg-white z-10">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <button
          onClick={() => setShowNotificationsModal(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => markAsRead(n._id)}
              className={`px-4 py-2 border-b last:border-b-0 cursor-pointer ${
                n.isRead
                  ? 'bg-white text-gray-800'
                  : 'bg-gray-100 font-medium text-gray-900'
              } hover:bg-gray-200 transition`}
            >
              <p className="text-sm">{n.message}</p>
              <p className="text-xs text-gray-600">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p className="px-4 py-2 text-sm text-gray-500 text-center">
            No notifications yet
          </p>
        )}
      </div>
    </div>
  </div>
)}
    </>
  )
}
