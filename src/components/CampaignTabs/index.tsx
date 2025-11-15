'use client'
import { useEffect, useRef } from 'react'

interface Props {
  activeTab: 'active' | 'finished' | 'rejected'
  setActiveTab: (tab: 'active' | 'finished' | 'rejected') => void
}

export const CampaignTabs = ({ activeTab, setActiveTab }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeButtonRef = useRef<HTMLButtonElement>(null)

  // scroll ke tombol Active saat load
  useEffect(() => {
    if (activeButtonRef.current && containerRef.current) {
      activeButtonRef.current.scrollIntoView({
        behavior: 'auto', // langsung tanpa animasi
        inline: 'start',  // tombol Active di kiri container
      })
    }
  }, [])

  const tabs = ['active', 'finished', 'rejected']

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <div className="inline-flex gap-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab
          const label = tab.charAt(0).toUpperCase() + tab.slice(1)
          return (
            <button
              key={tab}
              ref={isActive ? activeButtonRef : null}
              onClick={() => setActiveTab(tab as any)}
              className="px-6 py-2 rounded-full font-semibold text-white whitespace-nowrap"
              style={{
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
