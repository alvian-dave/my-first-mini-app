'use client'

import { ExternalLink, Loader2, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner' // Menggunakan Sonner untuk Toast

// Komponen Shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils' // Diperlukan untuk conditional styling

// --- Interface Definitions ---

interface Task {
  service: string
  type: string
  url: string
  done?: boolean
  connected?: boolean
}

interface Submission {
  status: string
  tasks: Task[]
}

interface TaskModalProps {
  campaignId: string
  title: string
  description: string
  tasks: Task[]
  onClose: () => void
  onConfirm: (submission: Submission) => void
  session: { user: { id: string } }
}

// --- Component ---

export default function TaskModal({
  campaignId,
  title,
  description,
  tasks,
  onClose,
  onConfirm,
  session,
}: TaskModalProps) {
  const [taskStates, setTaskStates] = useState(tasks)
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState<number | null>(null)
  const [twitterConnected, setTwitterConnected] = useState(false)
  const [discordConnected, setDiscordConnected] = useState(false)

  // Fungsi untuk menampilkan Toast menggunakan Sonner
  const showSonnerToast = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      toast.success(message, { duration: 3000 })
    } else {
      toast.error(message, { duration: 3000 })
    }
  }

  // ✅ Cek status koneksi dan submission
  useEffect(() => {
    const checkConnections = async () => {
      try {
        const twitterRes = await fetch('/api/connect/twitter/status')
        const twitterData = await twitterRes.json()
        if (twitterData?.connected) setTwitterConnected(true)

        const telegramRes = await fetch('/api/connect/telegram/status')
        const telegramData = await telegramRes.json()
        if (telegramData?.connected) {
          setTaskStates(prev =>
            prev.map(t => (t.service === 'telegram' ? { ...t, connected: true } : t))
          )
        }

        const discordRes = await fetch('/api/connect/discord/status')
        const discordData = await discordRes.json()
        if (discordData?.connected) {
          setDiscordConnected(true)
          setTaskStates(prev =>
            prev.map(t => (t.service === 'discord' ? { ...t, connected: true } : t))
          )
        }
      } catch (err) {
        console.error('Failed to check connection status', err)
      }
    }

    const fetchSubmission = async () => {
      try {
        const res = await fetch(`/api/submissions?campaignId=${campaignId}`)
        const data = await res.json()
        if (res.ok && data.submission) setTaskStates(data.submission.tasks)
      } catch (err) {
        console.error('Failed to load submission', err)
      }
    }

    checkConnections()
    fetchSubmission()

    // Event listener untuk notifikasi hasil koneksi (Sonner dipanggil di sini)
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data?.type === 'TWITTER_CONNECTED') {
        setTwitterConnected(true)
        showSonnerToast('Twitter connected successfully!', 'success')
        onClose()
      }
      if (event.data?.type === 'TWITTER_FAILED') {
        showSonnerToast('Twitter connection failed, please try again.', 'error')
      }
      if (event.data?.type === 'TELEGRAM_CONNECTED') {
        setTaskStates(prev =>
          prev.map(t => (t.service === 'telegram' ? { ...t, connected: true } : t))
        )
        showSonnerToast('Telegram connected successfully!', 'success')
        onClose()
      }
      if (event.data?.type === 'DISCORD_CONNECTED') {
        setDiscordConnected(true)
        setTaskStates(prev =>
          prev.map(t => (t.service === 'discord' ? { ...t, connected: true } : t))
        )
        showSonnerToast('Discord connected successfully!', 'success')
        onClose()
      }
      if (event.data?.type === 'DISCORD_FAILED') {
        showSonnerToast('Discord connection failed, please try again.', 'error')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [campaignId, onClose]) // onClose ditambahkan ke dependency array

  // ✅ Verifikasi task
  const handleVerify = async (idx: number, task: Task) => {
    try {
      setVerifying(idx)

      if (task.service === 'twitter' && !twitterConnected) {
        const res = await fetch('/api/connect/twitter/start')
        const data = await res.json()
        if (data.url) window.location.href = data.url
        return
      }

      if (task.service === 'telegram') {
        if (!task.connected) {
          // Menggunakan window.open untuk menghindari redirect pada modal yang sedang terbuka
          window.open(
            `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${session.user.id}`,
            '_blank'
          )
          return
        }

        const res = await fetch('/api/task/verify/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId }),
        })
        const data = await res.json()
        if (data.success && data.submission) {
          setTaskStates(data.submission.tasks)
          showSonnerToast('Telegram task verified successfully!', 'success')
        } else {
          showSonnerToast(data.error || 'Telegram verification failed', 'error')
        }
        return
      }

      if (task.service === 'discord') {
        if (!discordConnected) {
          const res = await fetch('/api/connect/discord/start')
          const data = await res.json()
          if (data?.url) {
            window.location.href = data.url
          } else {
            showSonnerToast('Failed to start Discord connect flow', 'error')
          }
          return
        }

        const verifyRes = await fetch('/api/task/verify/discord', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId, taskIndex: idx, task }),
        })
        const verifyData = await verifyRes.json()
        if (verifyData.success && verifyData.submission) {
          setTaskStates(verifyData.submission.tasks)
          showSonnerToast('Discord task verified successfully!', 'success')
        } else {
          showSonnerToast(verifyData.error || 'Discord verification failed', 'error')
        }
        return
      }

      // Generic verification
      const res = await fetch('/api/task/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, task }),
      })
      const data = await res.json()
      if (data.success && data.submission) {
        setTaskStates(data.submission.tasks)
        showSonnerToast('Task verified successfully!', 'success')
      } else {
        showSonnerToast(data.error || 'Verification failed', 'error')
      }
    } catch (err) {
      console.error('verify failed', err)
      showSonnerToast('Verification failed due to an error.', 'error')
    } finally {
      setVerifying(null)
    }
  }

  // ✅ Submit semua task
  const handleConfirm = async () => {
    if (!taskStates.every(t => t.done)) {
      showSonnerToast('Please complete all tasks first.', 'error')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        const submission = data.submission
        setTaskStates(submission.tasks)
        onConfirm(submission)
        onClose()
        if (data.alreadyRewarded) {
          showSonnerToast(
            'You have already received the reward for this campaign.',
            'success'
          )
        } else {
          showSonnerToast('All tasks submitted successfully!', 'success')
        }
      } else {
        showSonnerToast(data.error || 'Submission failed.', 'error')
      }
    } catch (err) {
      console.error('submit failed', err)
      showSonnerToast('Submission failed due to an error.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        // 1. Modal Container Dark Mode: bg-gray-800, text-gray-100
        className="sm:max-w-[425px] rounded-xl border-none bg-gray-800 text-gray-100"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription>
            <ScrollArea 
              // 2. Scroll Area Dark Mode: border-gray-700
              className="h-40 p-2 border border-gray-700 rounded-md"
            >
              <p 
                // 2. Teks Deskripsi Dark Mode: text-gray-400
                className="text-sm whitespace-pre-line text-gray-400"
              >
                {description}
              </p>
            </ScrollArea>
          </DialogDescription>
        </DialogHeader>

        {/* List Task (dengan conditional styling menggunakan cn) */}
        <div className="space-y-3">
          {taskStates.map((task, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                task.done 
                  // 3. Task Done Dark Mode: bg-green-700/20, border-green-600
                  ? "border-green-600 bg-green-700/20" 
                  // 3. Task Default Dark Mode: bg-gray-700/50, border-gray-700
                  : "border-gray-700 bg-gray-700/50"
              )}
            >
              <a
                href={
                  task.service === 'telegram'
                    ? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${session.user.id}`
                    : task.url
                }
                target="_blank"
                rel="noopener noreferrer"
                // Teks link default warna putih/terang
                className="flex-1 flex items-center gap-2 text-sm font-medium hover:text-green-500 transition-colors"
              >
                <span>
                  {task.service.toUpperCase()} — {task.type}
                </span>
                {/* Ikon link dark mode */}
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>

              {task.done ? (
                <div className="ml-3 flex items-center gap-1 text-sm text-green-500 font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </div>
              ) : (
                <Button
                  onClick={() => handleVerify(i, task)}
                  disabled={verifying === i}
                  className="ml-3 h-8 px-3 text-xs"
                  variant={
                    // Mengubah secondary untuk dark mode agar tidak terlalu menyatu
                    task.service === 'twitter' ||
                    task.service === 'telegram' ||
                    task.service === 'discord'
                      ? 'secondary' 
                      : 'default'
                  }
                >
                  {verifying === i ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : task.service === 'twitter' && !twitterConnected ? (
                    'Connect Twitter'
                  ) : task.service === 'telegram' && !task.connected ? (
                    'Connect Telegram'
                  ) : task.service === 'discord' && !discordConnected ? (
                    'Connect Discord'
                  ) : (
                    'Verify'
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            className={cn(
              "w-full h-10 font-semibold text-white", // Memastikan teks putih
              // 4. Confirm Button Dark Mode: bg-green-600
              "bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
            )}
            onClick={handleConfirm}
            disabled={submitting || !taskStates.every(t => t.done)}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Confirm & Submit'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}