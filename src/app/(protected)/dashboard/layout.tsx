'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavbarBottom from '@/components/NavbarBottom'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'

// ✅ IMPORT KOMPONEN IKLAN
import { BannerCarousel } from '@/components/BannerCarousel'
import AdPurchaseModal from '@/components/AdPurchaseModal'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [activeRole, setActiveRole] = useState<'hunter' | 'promoter'>('hunter')
  const [showChat, setShowChat] = useState(false)
  const [isAdModalOpen, setIsAdModalOpen] = useState(false)

  // ✅ LOGIKA FIX: Hanya tampil di root /dashboard/hunter atau /dashboard/promoter
  // Tidak akan tampil di /dashboard/hunter/anything-else
  const isRootDashboard = pathname === '/dashboard/hunter' || pathname === '/dashboard/promoter'
  
  // Navbar tetap tampil di semua halaman yang diawali /dashboard
  const isDashboardArea = pathname.startsWith('/dashboard')

  useEffect(() => {
    if (pathname.includes('/promoter')) {
      setActiveRole('promoter')
    } else if (pathname.includes('/hunter')) {
      setActiveRole('hunter')
    }
  }, [pathname])

  return (
    <div className="bg-[#020617] min-h-screen">
      
      <div className="relative">
        {/* 1. RENDER DASHBOARD UTAMA */}
        {children}

        {/* 2. RENDER BANNER (Hanya di halaman Utama Hunter/Promoter) */}
        {isRootDashboard && (
          <div className="absolute top-0 left-0 w-full z-20 pointer-events-none">
             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-[120px] pointer-events-auto">
                
                <div className="relative overflow-hidden rounded-[32px] bg-transparent">
                   <div className="w-full h-[160px] sm:h-[190px] relative flex items-center justify-center">
                      <BannerCarousel onOpenModal={() => setIsAdModalOpen(true)} />
                   </div>
                </div>

             </div>
          </div>
        )}
      </div>

      {/* Spacer agar konten tidak tertutup NavbarBottom */}
      <div className={isDashboardArea ? "h-20" : ""} />

      {/* ✅ MODAL PEMBELIAN */}
      <AdPurchaseModal 
        isOpen={isAdModalOpen} 
        onClose={() => setIsAdModalOpen(false)} 
      />

      {/* NAVBAR (Tetap tampil di seluruh area dashboard) */}
      {isDashboardArea && <NavbarBottom role={activeRole} />}

      {/* GLOBAL CHAT (Hanya tampil di root dashboard saja) */}
      {isRootDashboard && (
        <div className={`fixed bottom-28 left-6 z-[45] transition-all duration-300
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
            <Card className="w-[90vw] md:w-96 h-[500px] max-h-[calc(100dvh-140px)] bg-[#020617] border-white/10 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in zoom-in slide-in-from-bottom-10 origin-bottom-left">
              <CardHeader className={`shrink-0 py-4 px-6 flex flex-row items-center justify-between border-b border-white/5 ${activeRole === 'promoter' ? 'bg-blue-700' : 'bg-emerald-700'}`}>
                <CardTitle className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Comms</CardTitle>
                <button onClick={() => setShowChat(false)} className="text-[10px] font-black bg-black/20 hover:bg-black/40 px-3 py-1 rounded-full text-white transition-all">HIDE</button>
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