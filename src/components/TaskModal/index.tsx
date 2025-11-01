'use client'

import { Dialog } from '@headlessui/react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Toast from '@/components/Toast'

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
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)

  // ✅ Cek status Twitter, Telegram, Discord + submission
  useEffect(() => {
    const checkConnections = async () => {
      try {
        // Cek Twitter
        const twitterRes = await fetch('/api/connect/twitter/status')
        const twitterData = await twitterRes.json()
        if (twitterData?.connected) setTwitterConnected(true)

        // Cek Telegram
        const telegramRes = await fetch('/api/connect/telegram/status')
        const telegramData = await telegramRes.json()
        if (telegramData?.connected) {
          setTaskStates(prev =>
            prev.map(t => (t.service === 'telegram' ? { ...t, connected: true } : t))
          )
        }

        // Cek Discord
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

    // ✅ Event listener untuk notifikasi hasil koneksi (Twitter, Telegram, Discord)
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data?.type === 'TWITTER_CONNECTED') {
        setTwitterConnected(true)
        setToast({ message: 'Twitter connected successfully!', type: 'success' })
      }
      if (event.data?.type === 'TWITTER_FAILED') {
        setToast({ message: 'Twitter connection failed, please try again.', type: 'error' })
      }
      if (event.data?.type === 'TELEGRAM_CONNECTED') {
        setTaskStates(prev =>
          prev.map(t => (t.service === 'telegram' ? { ...t, connected: true } : t))
        )
        setToast({ message: 'Telegram connected successfully!', type: 'success' })
      }
      if (event.data?.type === 'DISCORD_CONNECTED') {
        setDiscordConnected(true)
        setTaskStates(prev =>
          prev.map(t => (t.service === 'discord' ? { ...t, connected: true } : t))
        )
        setToast({ message: 'Discord connected successfully!', type: 'success' })
      }
      if (event.data?.type === 'DISCORD_FAILED') {
        setToast({ message: 'Discord connection failed, please try again.', type: 'error' })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [campaignId])

  // ✅ Verifikasi task
  const handleVerify = async (idx: number, task: Task) => {
    try {
      setVerifying(idx)

      // Twitter flow (jangan ubah)
      if (task.service === 'twitter' && !twitterConnected) {
        const res = await fetch('/api/connect/twitter/start')
        const data = await res.json()
        if (data.url) window.location.href = data.url
        return
      }

      // Telegram flow (jangan ubah)
      if (task.service === 'telegram') {
        // Jika belum connect → buka Telegram app
        if (!task.connected) {
          window.open(
            `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${session.user.id}`,
            '_blank'
          )
          return
        }

        // Jika sudah connect → verify
        const res = await fetch('/api/task/verify/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId }),
        })
        const data = await res.json()
        if (data.success && data.submission) {
          setTaskStates(data.submission.tasks)
          setToast({ message: 'Telegram task verified successfully!', type: 'success' })
        } else {
          setToast({ message: data.error || 'Telegram verification failed', type: 'error' })
        }
        return
      }

      // Discord flow (baru)
      if (task.service === 'discord') {
        // Jika belum connect → panggil backend start (sama pola Twitter)
        if (!discordConnected) {
          const res = await fetch('/api/connect/discord/start')
          const data = await res.json()
          if (data?.url) {
            // Ikuti pola yang sudah ada: redirect ke url
            window.location.href = data.url
          } else {
            setToast({ message: 'Failed to start Discord connect flow', type: 'error' })
          }
          return
        }

        // Jika sudah connect → panggil verify discord endpoint
        const verifyRes = await fetch('/api/task/verify/discord', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId, taskIndex: idx, task }),
        })
        const verifyData = await verifyRes.json()
        if (verifyData.success && verifyData.submission) {
          setTaskStates(verifyData.submission.tasks)
          setToast({ message: 'Discord task verified successfully!', type: 'success' })
        } else {
          setToast({ message: verifyData.error || 'Discord verification failed', type: 'error' })
        }
        return
      }

      // Generic verification (untuk task lain)
      const res = await fetch('/api/task/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, task }),
      })
      const data = await res.json()
      if (data.success && data.submission) {
        setTaskStates(data.submission.tasks)
        setToast({ message: 'Task verified successfully!', type: 'success' })
      } else {
        setToast({ message: data.error || 'Verification failed', type: 'error' })
      }
    } catch (err) {
      console.error('verify failed', err)
      setToast({ message: 'Verification failed due to an error.', type: 'error' })
    } finally {
      setVerifying(null)
    }
  }

  // ✅ Submit semua task
  const handleConfirm = async () => {
    if (!taskStates.every(t => t.done)) {
      setToast({ message: 'Please complete all tasks first.', type: 'error' })
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
          setToast({
            message: 'You have already received the reward for this campaign.',
            type: 'success',
          })
        } else {
          setToast({ message: 'All tasks submitted successfully!', type: 'success' })
        }
      } else {
        setToast({ message: data.error || 'Submission failed.', type: 'error' })
      }
    } catch (err) {
      console.error('submit failed', err)
      setToast({ message: 'Submission failed due to an error.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-gray-800 text-white rounded-xl p-6 w-full max-w-lg">
          <Dialog.Title className="text-lg font-bold mb-4">{title}</Dialog.Title>
          <div className="mb-4 max-h-40 overflow-y-auto rounded border border-gray-700 p-2">
  <p className="text-gray-300 whitespace-pre-line">{description}</p>
</div>

          <div className="space-y-3 mb-4">
            {taskStates.map((task, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                <a
                  href={
                    task.service === 'telegram'
                      ? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${session.user.id}`
                      : task.url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center gap-2"
                >
                  <span>
                    {task.service.toUpperCase()} — {task.type}
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                {task.done ? (
                  <span className="ml-3 text-green-400 text-sm">✅ Verified</span>
                ) : (
                  <button
                    onClick={() => handleVerify(i, task)}
                    disabled={verifying === i}
                    className="ml-3 px-3 py-1 text-sm rounded bg-green-600 hover:bg-green-700 flex items-center gap-2"
                  >
                    {verifying === i ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
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
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            className="w-full py-2 rounded font-semibold mt-4 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#16a34a' }}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Confirm & Submit'
            )}
          </button>

          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
