'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'

// Shadcn UI Components
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send } from 'lucide-react'

interface Message {
  id: string
  username: string
  role: string
  text: string
  created_at: string
}

const formatTimestamp = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export const GlobalChatRoom = () => {
  const { data: session } = useSession()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [role, setRole] = useState<string>('Hunter') 
  const chatRef = useRef<HTMLDivElement>(null)

  const username =
    session?.user?.username || session?.user?.walletAddress?.split('@')[0] || 'anon'

  // --- Fungsi Pembantu ---
  const getRoleBadge = (msgRole: string) => {
    const role = msgRole.toLowerCase()
    if (role === 'admin') return <Badge className="bg-red-600 hover:bg-red-700 text-white">ADMIN</Badge>
    if (role === 'promoter') return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">PROMOTER</Badge>
    return <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600 text-white">HUNTER</Badge>
  }

  const getColorClass = (uname: string) => {
    if (uname === 'anon') return 'text-gray-600'
    const key = `chatColor-${uname}`
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
  // --- End Fungsi Pembantu ---

  // Fetch role dari DB
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

      if (data) setMessages(data as Message[])
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
    // Scroll to bottom on new message
    chatRef.current?.scrollTo({ 
        top: chatRef.current.scrollHeight, 
        behavior: 'smooth' 
    })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return

    await supabase.from('messages').insert({
      username,
      role, // pakai role hasil fetch DB
      text: input.trim(),
    })

    setInput('')
  }

  return (
    // Layout Flexbox untuk mengisi tinggi CardContent
    <div className="flex flex-col flex-1 min-h-0 h-full"> 
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 text-sm bg-gray-50"
      >
        {messages.map((m) => {
          const isSelf = m.username === username
          return (
            <div
              key={m.id}
              className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] px-3 py-2 rounded-xl shadow-md ${
                  isSelf
                    ? 'bg-green-500 text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                }`}
              >
                {/* Header Pesan */}
                <div className={`flex items-center gap-2 mb-1 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                  {!isSelf && getRoleBadge(m.role)}
                  <span
                    className={`text-xs font-bold ${isSelf ? 'text-green-100' : getColorClass(m.username)}`}
                  >
                    {m.username}
                  </span>
                  {isSelf && getRoleBadge(m.role)}
                  <span className={`text-xs ${isSelf ? 'text-green-200' : 'text-gray-500'} font-light`}>
                    {formatTimestamp(m.created_at)}
                  </span>
                </div>

                {/* Isi Pesan */}
                <div className={`${isSelf ? 'text-white' : 'text-gray-800'} whitespace-pre-line text-[0.9rem]`}>
                  {m.text}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input Area menggunakan komponen Shadcn */}
      <div className="border-t p-3 flex items-center gap-2 bg-white">
        <Input
          className="flex-1 text-sm focus-visible:ring-green-500"
          placeholder={`Chatting as ${username} (${role})...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}