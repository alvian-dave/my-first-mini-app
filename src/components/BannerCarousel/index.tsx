'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Lock, ArrowRight } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

interface AdBannerProps {
  onOpenModal: () => void
}

export function BannerCarousel({ onOpenModal }: AdBannerProps) {
  const [activeAd, setActiveAd] = useState<{ imageUrl: string; targetUrl: string } | null>(null)
  const [canBook, setCanBook] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const pathname = usePathname()

  const totalSlides = 4 

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const res = await fetch('/api/ads')
        if (res.ok) {
          const data = await res.json()
          if (data && data.ad) setActiveAd(data.ad)
          setCanBook(data.canBook)
        }
      } catch (err) {
        console.error("Ad Fetch Error:", err)
      }
    }
    fetchAd()
    const interval = setInterval(fetchAd, 60000)
    return () => clearInterval(interval)
  }, [])

  const isPromoter = pathname?.includes('/promoter')
  const theme = useMemo(() => ({
    accent: isPromoter ? 'blue' : 'emerald',
    ring: isPromoter 
      ? 'from-blue-500/40 via-cyan-400/20 to-indigo-500/40' 
      : 'from-emerald-500/40 via-teal-400/20 to-blue-500/40',
    shadow: isPromoter ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)',
    btnBg: isPromoter ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500',
    text: isPromoter ? 'text-blue-400' : 'text-emerald-400'
  }), [isPromoter])

  useEffect(() => {
    const slideDuration = (currentSlide % 3) === 1 && activeAd ? 10000 : 5000
    const timer = setTimeout(() => {
      setIsTransitioning(true)
      setCurrentSlide((prev) => prev + 1)
    }, slideDuration)
    return () => clearTimeout(timer)
  }, [currentSlide, activeAd])

  useEffect(() => {
    if (currentSlide === totalSlides - 1) {
      const resetTimer = setTimeout(() => {
        setIsTransitioning(false)
        setCurrentSlide(0)
      }, 850) 
      return () => clearTimeout(resetTimer)
    }
  }, [currentSlide])

  return (
    <div className="absolute inset-0 z-30 overflow-hidden rounded-[32px] p-[1px]">
      
      <div 
        className={`absolute inset-0 bg-gradient-to-r ${theme.ring} transition-opacity duration-1000
          ${(currentSlide % 3) !== 0 ? 'opacity-100' : 'opacity-0'}`} 
      />

      <div className={`relative h-full w-full rounded-[31px] overflow-hidden transition-all duration-1000 
        ${(currentSlide % 3) === 0 ? 'bg-transparent' : 'bg-[#020617]'}`}>
        
        <div 
          className={`flex h-full w-[400%] ${isTransitioning ? 'transition-transform duration-[850ms] ease-[cubic-bezier(0.33,1,0.68,1)]' : ''}`}
          style={{ transform: `translateX(-${(currentSlide * 100) / totalSlides}%)` }}
        >
          
          <div className="w-1/4 h-full bg-transparent" />

          <div className="w-1/4 h-full relative overflow-hidden flex flex-col items-center justify-center text-center">
            {activeAd ? (
              <a href={activeAd.targetUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 group">
                <img src={activeAd.imageUrl} className="w-full h-full object-fill transition-transform duration-[15000ms] group-hover:scale-110" alt="Ad" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-60" />
                
                {/* TOMBOL OPEN >> POJOK KANAN BAWAH GLOSSY */}
                <div className="absolute bottom-5 right-5 z-20">
                  <div className="relative group/btn overflow-hidden rounded-full p-[1px]">
                    {/* Glossy Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 animate-[shimmer_2s_infinite] -translate-x-full transition-transform duration-1000 group-hover/btn:duration-500" />
                    
                    <div className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl transition-all group-hover/btn:bg-white/20 group-hover/btn:scale-105">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white drop-shadow-md">OPEN</span>
                      <ArrowRight className="w-3 h-3 text-white animate-[bounce-x_1s_infinite]" />
                    </div>
                  </div>
                </div>
              </a>
            ) : (
              <div onClick={onOpenModal} className="cursor-pointer group">
                <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                   <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPromoter ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                   <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50">Space Available</span>
                </div>
                <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none">
                  OWN THIS <span className={theme.text}>SPACE</span>
                </h2>
                <p className="mt-2 text-[10px] font-medium text-white/50 max-w-[200px] leading-tight mx-auto">
                  Boost your brand or profile to the main frame.
                </p>
              </div>
            )}
          </div>

          <div 
            onClick={onOpenModal} 
            className="w-1/4 h-full flex flex-col items-center justify-center cursor-pointer group hover:bg-white/[0.02]"
          >
              <div className={`relative p-5 rounded-2xl transition-all duration-500 group-hover:scale-110 
                ${canBook ? theme.btnBg : 'bg-slate-800'} 
                shadow-[0_0_30px_-5px_${canBook ? theme.shadow : 'transparent'}]`}>
                {canBook ? <Plus className="w-7 h-7 text-white" strokeWidth={3} /> : <Lock className="w-7 h-7 text-slate-400" strokeWidth={2} />}
              </div>
              <span className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/60 group-hover:text-white">
                {canBook ? 'Create Your Ads' : 'Slot Fully Booked'}
              </span>
          </div>

          <div className="w-1/4 h-full bg-transparent" />
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-[2px] transition-all duration-700 rounded-full ${
                (currentSlide % 3) === i ? `w-8 ${isPromoter ? 'bg-blue-500' : 'bg-emerald-500'}` : 'w-2 bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  )
}