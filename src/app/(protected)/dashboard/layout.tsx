'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavbarBottom from '@/components/NavbarBottom'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [activeRole, setActiveRole] = useState<'hunter' | 'promoter'>('hunter')
  const [showChat, setShowChat] = useState(false)

  const isDashboardPage = pathname.startsWith('/dashboard')
  
  // LOGIKA BARU: Chat hanya muncul jika path EXACT /dashboard/hunter atau /dashboard/promoter
  const isRootDashboard = pathname === '/dashboard/hunter' || pathname === '/dashboard/promoter'

  useEffect(() => {
    if (pathname.includes('/promoter')) {
      setActiveRole('promoter')
    } else if (pathname.includes('/hunter')) {
      setActiveRole('hunter')
    }
  }, [pathname])

  return (
    <div className="bg-[#020617] min-h-screen">
      {/* Konten utama tetap bersih agar sticky tabs bekerja */}
      <div className={isDashboardPage ? "pb-16" : ""}>
        {children}
      </div>

      {/* NAVBAR (z-40) - Tetap tampil di semua halaman dashboard */}
      {isDashboardPage && <NavbarBottom role={activeRole} />}

      {/* GLOBAL CHAT (z-45) - Hanya tampil jika isRootDashboard TRUE */}
      {isDashboardPage && isRootDashboard && (
        <div className={`fixed bottom-28 left-6 z-[45] transition-all duration-300
          /* Sembunyikan chat jika modal sistem terbuka */
          [body:has([data-state="open"])]:scale-0
          [body:has([data-state="open"])]:pointer-events-none
        `}> 
          {!showChat ? (
            <Button
              size="icon"
              className={`w-14 h-14 rounded-full shadow-2xl border-t border-white/20 hover:scale-110 active:scale-95 transition-transform
                ${activeRole === 'promoter' ? 'bg-blue-600 shadow-blue-900/40' : 'bg-emerald-600 shadow-emerald-900/40'}`}
              onClick={() => setShowChat(true)}
            >
              <MessageCircle className="w-6 h-6 text-white" />
            </Button>
          ) : (
            <Card className="
              w-[90vw] md:w-96 
              h-[500px] 
              max-h-[calc(100dvh-140px)] 
              bg-[#020617] border-white/10 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] 
              flex flex-col animate-in zoom-in slide-in-from-bottom-10 origin-bottom-left 
              overflow-hidden
            ">
              <CardHeader className={`shrink-0 py-4 px-6 flex flex-row items-center justify-between border-b border-white/5
                ${activeRole === 'promoter' ? 'bg-blue-700' : 'bg-emerald-700'}`}>
                <CardTitle className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Comms</CardTitle>
                <button 
                  onClick={() => setShowChat(false)} 
                  className="text-[10px] font-black bg-black/20 hover:bg-black/40 px-3 py-1 rounded-full text-white transition-all"
                >
                  HIDE
                </button>
              </CardHeader>

              <CardContent className="flex-1 min-h-0 p-0 overflow-hidden bg-[#020617] relative">
                 <GlobalChatRoom />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}