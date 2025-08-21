'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  username: string
  role: string
  text: string
  created_at: string
}

export const GlobalChatRoom = () => {
  const { data: session } = useSession()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [role, setRole] = useState<string>('unknown')
  const chatRef = useRef<HTMLDivElement>(null)

  const username =
    session?.user?.username || session?.user?.walletAddress?.split('@')[0] || 'anon'

  // ✅ Fetch role dari DB, bukan session
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch('/api/roles/get')
        const data = await res.json()
        if (data.success && data.activeRole) {
          setRole(data.activeRole)
        }
      } catch (err) {
        console.error('Failed to fetch role', err)
      }
    }

    fetchRole()
  }, [])

  useEffect(() => {
    // Fetch messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })

      if (data) setMessages(data)
    }

    fetchMessages()

    // Realtime subscription
    const channel = supabase
      .channel('global-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return

    await supabase.from('messages').insert({
      username,
      role, // ✅ pakai role hasil fetch DB
      text: input.trim(),
    })

    setInput('')
  }

  const getColorClass = (username: string) => {
    if (username === 'anon') return 'text-gray-600'
    const key = `chatColor-${username}`
    const saved = localStorage.getItem(key)
    if (saved) return saved
    const colors = [
      'text-blue-600',
      'text-green-600',
      'text-purple-600',
      'text-pink-600',
      'text-orange-600',
      'text-indigo-600',
    ]
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    localStorage.setItem(key, randomColor)
    return randomColor
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 text-sm bg-white"
      >
        {messages.map((m) => {
          const isSelf = m.username === username
          return (
            <div
              key={m.id}
              className={`max-w-[75%] px-3 py-2 rounded-lg shadow ${
                isSelf
                  ? 'bg-green-100 text-right ml-auto'
                  : 'bg-gray-100 text-left mr-auto'
              }`}
            >
              <div
                className={`text-xs font-semibold ${getColorClass(m.username)}`}
              >
                {m.username} ({m.role}) ·{' '}
                {new Date(m.created_at).toLocaleTimeString()}
              </div>
              <div className="text-gray-800 whitespace-pre-line mt-1">
                {m.text}
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t p-2 flex items-center gap-2">
        <input
          className="flex-1 border rounded p-2 text-sm"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  )
}
