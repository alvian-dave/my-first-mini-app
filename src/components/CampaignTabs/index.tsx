// components/CampaignTabs.tsx
'use client'

import { useRef, useEffect } from 'react'

interface Props {
  activeTab: 'active' | 'finished' | 'rejected'
  setActiveTab: (tab: 'active' | 'finished' | 'rejected') => void
}

export const CampaignTabs = ({ activeTab, setActiveTab }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Optional: otomatis scroll ke tab aktif saat render
  useEffect(() => {
    const container = containerRef.current
    const activeButton = container?.querySelector('.active-tab') as HTMLElement
    if (container && activeButton) {
      const offsetLeft = activeButton.offsetLeft
      const containerWidth = container.offsetWidth
      const buttonWidth = activeButton.offsetWidth
      const scrollPos = offsetLeft - (containerWidth - buttonWidth) / 2
      container.scrollTo({ left: scrollPos, behavior: 'smooth' })
    }
  }, [activeTab])

  return (
    <div
      ref={containerRef}
      className="flex gap-4 overflow-x-auto"
    >
      {['active', 'finished', 'rejected'].map((tab) => {
        const isActive = activeTab === tab
        const label = tab.charAt(0).toUpperCase() + tab.slice(1)
        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-2 rounded-full font-semibold ${
              isActive ? 'active-tab' : ''
            }`}
            style={{
              backgroundColor: isActive ? '#16a34a' : '#374151',
              color: isActive ? '#ffffff' : '#d1d5db',
              flex: '0 0 auto', // agar tombol tidak mengecil
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
