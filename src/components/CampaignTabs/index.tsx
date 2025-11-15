// components/CampaignTabs.tsx
'use client'

interface Props {
  activeTab: 'active' | 'finished' | 'rejected'
  setActiveTab: (tab: 'active' | 'finished' | 'rejected') => void
}

export const CampaignTabs = ({ activeTab, setActiveTab }: Props) => {
  const tabs = ['active', 'finished', 'rejected']
  const buttonWidth = 100 // lebar tombol tetap, misal 100px

  return (
    <div className="px-6 w-full">
      <div
        className="flex w-full"
        style={{
          justifyContent: 'space-between', // otomatis sesuaikan gap
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab
          const label = tab.charAt(0).toUpperCase() + tab.slice(1)
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className="py-2 rounded-full font-semibold text-white"
              style={{
                width: `${buttonWidth}px`, // lebar tombol tetap
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
