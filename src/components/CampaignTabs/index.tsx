// components/CampaignTabs.tsx
'use client'

interface Props {
  activeTab: 'Active' | 'Finished' | 'Rejected'
  setActiveTab: (tab: 'Active' | 'Finished' | 'Rejected') => void
}

export const CampaignTabs = ({ activeTab, setActiveTab }: Props) => {
  return (
    <div className="flex justify-center gap-6 mb-6">
      {['active', 'finished', 'rejected'].map((tab) => {
        const isActive = activeTab === tab
        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className="capitalize px-4 py-2 rounded-full font-medium"
            style={{
              backgroundColor: isActive ? '#16a34a' : '#374151', // hijau / abu
              color: isActive ? '#ffffff' : '#d1d5db',           // putih / abu terang
            }}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}
