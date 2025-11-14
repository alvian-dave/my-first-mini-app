// components/CampaignTabs.tsx
'use client'

interface Props {
  activeTab: 'active' | 'finished' | 'rejected'
  setActiveTab: (tab: 'active' | 'finished' | 'rejected') => void
}

export const CampaignTabs = ({ activeTab, setActiveTab }: Props) => {
  return (
    <div className="flex justify-center gap-4">
      {['active', 'finished', 'rejected'].map((tab) => {
        const isActive = activeTab === tab
        const label = tab.charAt(0).toUpperCase() + tab.slice(1) // Awal huruf besar
        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className="px-5 py-2 rounded-full font-semibold text-white"
            style={{
              backgroundColor: isActive ? '#16a34a' : '#374151', // hijau / abu
              color: isActive ? '#ffffff' : '#d1d5db',           // putih / abu terang
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
