'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'

interface Campaign {
  _id: string
  title: string
  description: string
  reward: string
  status: 'active' | 'finished' | 'rejected'
  links?: { url: string; label: string }[]
  contributors?: number
}

export default function HunterDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [hunterBalance, setHunterBalance] = useState(0)
  const [submittedTasks, setSubmittedTasks] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rejected'>('active')
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/')
  }, [status, router])

  useEffect(() => {
    const loadCampaigns = async () => {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      setCampaigns(data)
    }
    loadCampaigns()
  }, [])

  if (status === 'loading') return <div className="text-white p-6">Loading...</div>
  if (!session?.user) return null

  const filtered = campaigns
    .filter((c) => {
      if (activeTab === 'active') {
        return c.status === 'active' && !submittedTasks.includes(c._id)
      }
      if (activeTab === 'completed') {
        return submittedTasks.includes(c._id)
      }
      if (activeTab === 'rejected') {
        return c.status === 'rejected'
      }
      return false
    })
    .sort((a, b) => (a._id > b._id ? -1 : 1))

  const handleSubmitTask = async (campaignId: string) => {
    try {
      await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ $inc: { contributors: 1 } }),
      })

      setSubmittedTasks((prev) => [...prev, campaignId])
      setCampaigns((prev) =>
        prev.map((c) =>
          c._id === campaignId ? { ...c, contributors: (c.contributors || 0) + 1 } : c
        )
      )
    } catch (err) {
      console.error('Failed to submit task', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white w-full">
      <Topbar />

      <div className="w-full px-6 py-8">
        <div
          className="text-center font-semibold text-white rounded-lg py-3 mb-6 shadow-lg"
          style={{ background: 'linear-gradient(to right, #16a34a, #3b82f6)' }}
        >
          "Every task you complete brings you closer to greatness..."
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          {['active', 'completed', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className="px-5 py-2 rounded-full font-semibold text-white"
              style={{
                backgroundColor: activeTab === tab ? '#16a34a' : '#374151',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Task Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 col-span-2">No tasks in this tab.</p>
          ) : (
            filtered.map((c) => (
              <div
                key={c._id}
                className="bg-gray-800 p-5 rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-green-400">{c.title}</h3>
                  {submittedTasks.includes(c._id) && (
                    <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded">
                      Submitted
                    </span>
                  )}
                </div>
                <p className="text-gray-300 mb-2">{c.description}</p>
                <p className="text-sm text-gray-400 mb-2">
                  Reward:{' '}
                  <span className="text-green-400 font-semibold">{c.reward}</span>
                </p>
                {c.links?.map((l, i) => (
                  <a
                    key={i}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline text-sm block mb-1"
                  >
                    {l.label}
                  </a>
                ))}

                {!submittedTasks.includes(c._id) ? (
                  <button
                    className="mt-3 w-full py-2 rounded font-semibold text-white"
                    style={{ backgroundColor: '#16a34a' }}
                    onClick={() => handleSubmitTask(c._id)}
                  >
                    Submit Task
                  </button>
                ) : (
                  <p className="text-green-400 mt-2 font-medium">
                    Task Submitted — Status:{' '}
                    <span
                      className={
                        c.status === 'finished' ? 'text-blue-400' : 'text-green-400'
                      }
                    >
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Chat */}
      <div className="fixed bottom-4 left-4 z-50">
        {!showChat ? (
          <div className="text-center">
            <button
              className="p-3 rounded-full shadow hover:scale-105 transition text-white"
              style={{ backgroundColor: '#16a34a' }}
              onClick={() => setShowChat(true)}
            >
              💬
            </button>
            <p className="text-xs text-gray-400 mt-1">Chat</p>
          </div>
        ) : (
          <div className="w-80 h-96 bg-white text-black rounded-xl shadow-lg overflow-hidden flex flex-col">
            <div
              className="flex justify-between items-center px-4 py-2 text-white"
              style={{ backgroundColor: '#16a34a' }}
            >
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
