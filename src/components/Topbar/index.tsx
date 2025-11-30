// Refactored Topbar using only shadcn UI components available in your project
// - Logic and functions are kept exactly the same (no behavioral changes)
// - Only styling / visual components replaced with shadcn components and lucide-react icons
// - Uses only these shadcn components (as provided): avatar, badge, button, card, dialog, dropdown-menu, form, input, label, select, sonner, tabs, textarea, tooltip

'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getWRCreditBalance } from '@/lib/getWRCreditBalance'

// shadcn UI components (available in your project)
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

// icons (lucide-react)
import { Home, LogOut, Bell, Mail, Info, RefreshCw } from 'lucide-react'

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
          <Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" className="flex items-center gap-2 p-2">
      <Home className="w-5 h-5" />
      <span className="hidden sm:inline text-lg font-semibold tracking-wide">Dashboard</span>
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Home</p>
  </TooltipContent>
</Tooltip>
        </div>

        {/* CENTER: keep empty so layout stays single-line and balanced */}
        <div className="flex-1" />

        {/* RIGHT: Icons + profile */}
        {status === 'authenticated' && (
          <div className="relative flex items-center gap-2">
            {/* LOGOUT ICON (to the left of profile) */}
            <Tooltip>
  <TooltipTrigger asChild>
    <Button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="p-2"
      aria-label="Logout"
    >
      <LogOut className="w-5 h-5 text-red-400" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Logout</p>
  </TooltipContent>
</Tooltip>

            {/* NOTIFICATION ICON (single) */}
            <Tooltip>
  <TooltipTrigger asChild>
    <Button onClick={openNotifications} className="relative p-2" aria-label="Notifications">
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 text-[10px]">{unreadCount}</Badge>
      )}
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Notifications</p>
  </TooltipContent>
</Tooltip>

            {/* CONTACT US ICON */}
            <Tooltip>
  <TooltipTrigger asChild>
    <Button
      onClick={() => { setShowContactUs(true); setIsMenuOpen(false) }}
      className="p-2"
      aria-label="Contact us"
    >
      <Mail className="w-5 h-5" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Contact Us</p>
  </TooltipContent>
</Tooltip>

            {/* ABOUT ICON */}
            <Tooltip>
  <TooltipTrigger asChild>
    <Button
      onClick={() => { setShowAbout(true); setIsMenuOpen(false) }}
      className="p-2"
      aria-label="About"
    >
      <Info className="w-5 h-5" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>About</p>
  </TooltipContent>
</Tooltip>

            {/* PROFILE BUTTON (id kept as topbar-button to match original click-outside logic) */}
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  id="topbar-button"
                  onClick={() => { setShowNotificationsModal(false); setIsMenuOpen((s) => !s) }}
                  aria-label="User menu"
                  className="flex items-center gap-2 p-2"
                >
                  <div className="hidden sm:flex flex-col text-right leading-tight">
                    <span className="text-sm font-semibold truncate max-w-[140px]">{username}</span>
                    <span className="text-xs text-green-400 uppercase truncate">{role || 'No role'}</span>
                  </div>
                  <Avatar className="w-9 h-9 bg-gray-700 text-sm font-bold uppercase flex items-center justify-center">
                    {username?.[0] || 'U'}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              {/* PROFILE DROPDOWN (id kept topbar-menu to match original click-outside logic) */}
              <DropdownMenuContent id="topbar-menu" align="end" className="w-64">
                <div className="px-4 py-3 bg-gray-100 border-b">
                  <p className="text-sm font-semibold text-gray-900 truncate">{username}</p>
                  <p className="text-xs text-green-600 uppercase">{role || 'No role'}</p>
                </div>

                <DropdownMenuItem asChild>
                  <button
                    onClick={handleRefresh}
                    disabled={!canRefresh}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md ${!canRefresh ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {refreshing ? <span className="animate-spin">⏳</span> : <RefreshCw className="w-4 h-4" />}
                    <span>Refresh</span>
                  </button>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <div className="px-4 py-2 flex justify-between items-center text-sm">
                  <span>Main balance</span>
                  <span className="font-medium">{mainBalance !== null ? `${mainBalance} WR` : '—'}</span>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <button
                    onClick={handleChooseRole}
                    disabled={isNavigating}
                    className={`w-full text-left px-4 py-2 ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isNavigating ? 'Loading…' : 'Choose role'}
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <Button variant="ghost" onClick={() => setShowNotificationsModal(false)} className="text-gray-500 hover:text-gray-700">Close</Button>
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
