'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getWRCreditBalance } from '@/lib/getWRCreditBalance'
import { Home, Bell, Mail, Info, LogOut, User, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

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

  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)

  const [refreshing, setRefreshing] = useState(false)
  const [canRefresh, setCanRefresh] = useState(true)

  const username =
    session?.user?.username ||
    session?.user?.walletAddress?.split('@')[0] ||
    'Unknown User'

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
    setTimeout(() => setCanRefresh(true), 10000)
  }

  useEffect(() => {
    if (!session?.user?.id) return
    const init = async () => {
      try {
        const res = await fetch('/api/roles/get')
        const data = await res.json()
        const activeRole = data.success && data.activeRole ? data.activeRole : ''
        setRole(activeRole)

        await fetchBalance()
        if (activeRole) await fetchNotifications(activeRole)
      } catch (err) {
        console.error('Failed initial fetch:', err)
      }
    }
    init()
  }, [session])

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

  const [isNavigating, setIsNavigating] = useState(false)
  const handleChooseRole = () => {
    setIsNavigating(true)
    router.push('/home')
    setTimeout(() => setIsNavigating(false), 2000)
  }

  const openNotifications = () => {
    setIsMenuOpen(false)
    setShowNotificationsModal(true)
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-gray-900 text-white shadow px-4 py-3 flex items-center justify-between">
        {/* LEFT: Home */}
        <Button variant="ghost" size="icon" className="flex items-center gap-2" aria-label="Home" title="Home">
          <Home className="w-6 h-6" />
        </Button>

        <div className="flex-1" />

        {status === 'authenticated' && (
          <div className="flex items-center gap-2 relative">
            {/* Logout */}
            <Button variant="ghost" size="icon" onClick={handleLogout} disabled={isLoggingOut} title="Logout">
              <LogOut className="w-5 h-5 text-red-400" />
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" onClick={openNotifications} title="Notifications">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1">{unreadCount}</Badge>}
            </Button>

            {/* Contact Us */}
            <Button variant="ghost" size="icon" onClick={() => setShowContactUs(true)} title="Contact us">
              <Mail className="w-5 h-5" />
            </Button>

            {/* About */}
            <Button variant="ghost" size="icon" onClick={() => setShowAbout(true)} title="About">
              <Info className="w-5 h-5" />
            </Button>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" id="topbar-button" className="flex items-center gap-2">
                  <div className="hidden sm:flex flex-col text-right leading-tight">
                    <span className="text-sm font-semibold truncate max-w-[140px]">{username}</span>
                    <span className="text-xs text-green-400 uppercase truncate">{role || 'No role'}</span>
                  </div>
                  <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center font-bold uppercase text-sm">
                    {username?.[0] || 'U'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent id="topbar-menu" align="end">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-semibold">{username}</p>
                  <p className="text-xs text-green-600 uppercase">{role || 'No role'}</p>
                </div>

                <DropdownMenuItem asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between" onClick={handleRefresh} disabled={!canRefresh}>
                    {refreshing ? 'Loading…' : 'Refresh'}
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <span className="flex justify-between w-full">Main balance <span className="font-medium">{mainBalance !== null ? `${mainBalance} WR` : '—'}</span></span>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Button variant="ghost" size="sm" className="w-full text-left" onClick={handleChooseRole} disabled={isNavigating}>
                    {isNavigating ? 'Loading…' : 'Choose role'}
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </header>

      {/* Modals */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showContactUs && <ContactUsModal onClose={() => setShowContactUs(false)} />}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <Dialog open={showNotificationsModal} onOpenChange={setShowNotificationsModal}>
          <DialogContent className="w-96 max-h-[70vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Notifications</DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowNotificationsModal(false)}>Close</Button>
            </DialogHeader>
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
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
