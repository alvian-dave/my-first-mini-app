'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  activeTab: 'active' | 'finished' | 'rejected'
  setActiveTab: (tab: 'active' | 'finished' | 'rejected') => void
}

export const CampaignTabs = ({ activeTab, setActiveTab }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeButtonRef = useRef<HTMLButtonElement>(null)
  const [rightPadding, setRightPadding] = useState(0) // padding kanan dinamis

  const tabs = ['active', 'finished', 'rejected']

  // scroll otomatis ke tombol Active saat load
  useEffect(() => {
    if (activeButtonRef.current && containerRef.current) {
      // scroll tombol Active ke posisi start dengan jarak 24px
      const offsetLeft = activeButtonRef.current.offsetLeft
      containerRef.current.scrollLeft = offsetLeft - 24
    }
  }, [])

  // update padding kanan agar tombol terakhir berhenti 24px dari tepi
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
    const maxScroll = scrollWidth - clientWidth
    const remaining = maxScroll - scrollLeft
    // jika sudah dekat akhir, beri padding kanan agar tombol terakhir berhenti 24px dari kanan
    setRightPadding(remaining < 24 ? 24 - remaining : 0)
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto"
      onScroll={handleScroll}
      style={{ scrollBehavior: 'smooth' }}
    >
      <div
        className="flex gap-4"
        style={{ paddingLeft: 24, paddingRight: rightPadding }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab
          const label = tab.charAt(0).toUpperCase() + tab.slice(1)
          return (
            <button
              key={tab}
              ref={isActive ? activeButtonRef : null}
              onClick={() => setActiveTab(tab as any)}
              className="flex-shrink-0 py-2 rounded-full font-semibold text-white whitespace-nowrap"
              style={{
                paddingLeft: 24,
                paddingRight: 24,
                backgroundColor: isActive ? '#16a34a' : '#374151',
                color: isActive ? '#ffffff' : '#d1d5db',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
