// components/CampaignTabs.tsx
'use client'

interface Props {
  activeTab: 'active' | 'finished' | 'rejected'
  setActiveTab: (tab: 'active' | 'finished' | 'rejected') => void
}

export const CampaignTabs = ({ activeTab, setActiveTab }: Props) => {
  return (
    <div className="flex justify-center gap-6 mb-6">
      {['active', 'finished', 'rejected'].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab as any)}
          className={`capitalize px-4 py-2 rounded-full font-medium ${
            activeTab === tab
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}