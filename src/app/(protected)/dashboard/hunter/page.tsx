'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/Topbar'
import { GlobalChatRoom } from '@/components/GlobalChatRoom'

interface Campaign {
  id: number
  title: string
  description: string
  reward: string
  status: 'active' | 'finished' | 'rejected'
  links?: { url: string; label: string }[]
  owner?: string
}

export default function HunterDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [campaigns] = useState<Campaign[]>([])
  const [hunterBalance, setHunterBalance] = useState(0)
  const [submittedTasks, setSubmittedTasks] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rejected'>('active')
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/')
    }
  }, [status, router])

  if (status === 'loading') {
    return <div className="text-white p-6">Loading...</div>
  }

  if (!session?.user) {
    return null
  }

  const filtered = campaigns.filter((c) => {
    if (activeTab === 'active') return !submittedTasks.includes(c.id)
    if (activeTab === 'completed') return submittedTasks.includes(c.id)
    return false
  }).sort((a, b) => b.id - a.id)

  return (
    <div className="min-h-screen bg-gray-900 text-white w-full">
      <Topbar />

      <div className="w-full px-6 py-8">
        {/* Motivation */}
        <div
          className="text-center font-semibold text-white rounded-lg py-3 mb-6 shadow-lg"
          style={{ backgroundColor: 'linear-gradient(to right, #16a34a, #3b82f6)' }}
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
                key={c.id}
                className="bg-gray-800 p-5 rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-green-400">{c.title}</h3>
                  <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded">🔥</span>
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

                {!submittedTasks.includes(c.id) ? (
                  <button
                    className="mt-3 w-full py-2 rounded font-semibold text-white"
                    style={{ backgroundColor: '#16a34a' }} // ✅ pakai inline style hijau
                    disabled
                  >
                    Submit Task
                  </button>
                ) : (
                  <p className="text-green-400 mt-2 font-medium">Task Submitted</p>
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
              style={{ backgroundColor: '#16a34a' }} // ✅ inline style hijau
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
              style={{ backgroundColor: '#16a34a' }} // ✅ inline style hijau
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
