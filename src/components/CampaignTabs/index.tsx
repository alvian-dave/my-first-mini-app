// components/CampaignTabs.tsx
'use client'

interface Props {
  activeTab: 'active' | 'finished' | 'rejected'
  setActiveTab: (tab: 'active' | 'finished' | 'rejected') => void
}

export const CampaignTabs = ({ activeTab, setActiveTab }: Props) => {
  const tabs = ['active', 'finished', 'rejected']

  return (
    <div className="w-full">
      <div className="flex w-full gap-4 justify-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab
          const label = tab.charAt(0).toUpperCase() + tab.slice(1)
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className="py-2 px-6 rounded-full font-semibold text-white"
              style={{
                backgroundColor: isActive ? '#16a34a' : '#374151',
                color: isActive ? '#ffffff' : '#d1d5db',
                fontSize: 'clamp(14px, 2vw, 18px)', // teks responsive
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
