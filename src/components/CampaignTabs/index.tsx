// components/CampaignTabs.tsx
'use client'

interface Props {
  activeTab: 'active' | 'finished' | 'rejected'
  setActiveTab: (tab: 'active' | 'finished' | 'rejected') => void
}

export const CampaignTabs = ({ activeTab, setActiveTab }: Props) => {
  return (
<div className="w-full overflow-x-auto">
  <div className="flex justify-center gap-4 max-w-full px-6">
    {['active', 'finished', 'rejected'].map((tab) => {
      const isActive = activeTab === tab
      const label = tab.charAt(0).toUpperCase() + tab.slice(1)
      return (
        <button
          key={tab}
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
