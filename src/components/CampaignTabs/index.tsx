'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  activeTab: 'active' | 'finished' | 'rejected'
  setActiveTab: (tab: 'active' | 'finished' | 'rejected') => void
}

export const CampaignTabs = ({ activeTab, setActiveTab }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeButtonRef = useRef<HTMLButtonElement>(null)
  const [isAtStart, setIsAtStart] = useState(true)
  const [isAtEnd, setIsAtEnd] = useState(false)

  const tabs = ['active', 'finished', 'rejected']

  // scroll ke tombol Active saat load
  useEffect(() => {
    if (activeButtonRef.current && containerRef.current) {
      activeButtonRef.current.scrollIntoView({ behavior: 'auto', inline: 'start' })
    }
  }, [])

  // update state scroll untuk padding kanan/kanan dinamis
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
    setIsAtStart(scrollLeft === 0)
    setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - 1)
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto scrollbar-hide"
      onScroll={handleScroll}
      style={{
        scrollPaddingLeft: '24px', // px-6 = 1.5rem = 24px
        scrollPaddingRight: '24px',
      }}
    >
      <div
        className={`inline-flex gap-4 ${isAtStart ? 'pl-6' : 'pl-0'} ${isAtEnd ? 'pr-6' : 'pr-0'}`}
      >
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
