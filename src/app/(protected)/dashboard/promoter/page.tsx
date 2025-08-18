'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import GlobalChatRoom from '@/components/GlobalChatRoom'
import CampaignForm from '@/components/CampaignForm'
import CampaignTabs from '@/components/CampaignTabs'

interface Campaign {
  id: number
  title: string
  description: string
  reward: string
  status: 'active' | 'finished' | 'rejected'
  links?: { url: string; label: string }[]
}

export default function ClientDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'finished' | 'rejected'>('active')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [contributorsMap, setContributorsMap] = useState<{ [id: number]: number }>({})
  const [balance, setBalance] = useState(0)
  const [showChat, setShowChat] = useState(false)

  // Redirect ke /login/client jika belum login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/home')
    }
  }, [status, router])

  // Tampilkan loading saat sesi masih dimuat
  if (status === 'loading') {
    return <div className="text-white p-6">Loading...</div>
  }

  // Jika sudah dicek dan tidak ada session, jangan render dashboard
  if (!session?.user) {
    return null
  }

  // Fungsi fetchCampaigns (aktifkan jika API siap)
  // const fetchCampaigns = async () => {
  //   try {
  //     const res = await fetch('/api/client/campaigns')
  //     const data = await res.json()
  //     setCampaigns(data || [])
  //   } catch (err) {
  //     console.error('Failed to load campaigns', err)
  //   }
  // }

  // Fungsi fetchBalance (aktifkan jika API siap)
  // const fetchBalance = async () => {
  //   try {
  //     const res = await fetch('/api/client/balance')
  //     const data = await res.json()
  //     setBalance(data.balance || 0)
  //   } catch (err) {
  //     console.error('Failed to load balance', err)
  //   }
  // }

  const handleSubmit = async (newCampaign: Campaign) => {
    // Sementara nonaktifkan submit sampai handler API siap
    console.log('Campaign submitted:', newCampaign)
    setIsModalOpen(false)
  }

  const current = campaigns
    .filter(c => (c.status || 'active') === activeTab)
    .sort((a, b) => b.id - a.id)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Topbar />
      <main className="w-full px-4 md:px-12 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-medium">
            Balance:{' '}
            <span className="text-green-400 font-bold">{balance.toFixed(2)} WR</span>
          </div>
          <button
            onClick={() => alert('Topup coming soon!')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded"
          >
            Topup
          </button>
        </div>
        <div className="text-center mb-6">
          <button
            onClick={() => {
              setEditingCampaign(null)
              setIsModalOpen(true)
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-semibold shadow"
          >
            + Create Campaign
          </button>
        </div>
        <CampaignTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        {current.length === 0 ? (
          <p className="text-center text-gray-400">No campaigns in this tab.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {current.map(c => (
              <div
                key={c.id}
                className="bg-gray-800 p-5 rounded shadow hover:shadow-lg transition"
              >
                <h3 className="text-lg font-bold text-blue-400">{c.title}</h3>
                <p className="text-gray-300 my-2 whitespace-pre-wrap">{c.description}</p>
                <p className="text-sm text-green-400 font-semibold">Reward: {c.reward}</p>
                <p className="text-sm text-gray-400">
                  Contributors: <b>{contributorsMap[c.id] || 0}</b>
                </p>
                {c.links?.map((l, i) => (
                  <a
                    key={i}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline block text-sm mt-1"
                  >
                    {l.label}
                  </a>
                ))}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setEditingCampaign(c)
                      setIsModalOpen(true)
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Delete this campaign?')) {
                        // Sementara nonaktifkan delete sampai handler API siap
                        console.log('Campaign deleted:', c.id)
                        // fetchCampaigns()
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <CampaignForm
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingCampaign(null)
          }}
          onSubmit={handleSubmit}
          editingCampaign={editingCampaign}
          setEditingCampaign={setEditingCampaign}
        />
      </main>
      <div className="fixed bottom-4 left-4 z-50">
        {!showChat ? (
          <div className="text-center">
            <button
              className="bg-green-600 p-3 rounded-full shadow hover:scale-105 transition"
              onClick={() => setShowChat(true)}
            >
              💬
            </button>
            <p className="text-xs text-gray-400 mt-1">Chat</p>
          </div>
        ) : (
          <div className="w-80 h-96 bg-white text-black rounded-xl shadow-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center bg-green-600 text-white px-4 py-2">
              <span className="font-semibold">Global Chat</span>
              <button onClick={() => setShowChat(false)}>✕</button>
            </div>
            <GlobalChatRoom />
          </div>
        )}
      </div>
    </div>
  )
}
// ...existing code...