'use client'

import { Dialog } from '@headlessui/react'
import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Task {
  service: string
  type: string
  url: string
  done?: boolean
}

interface TaskModalProps {
  campaignId: string
  title: string
  description: string
  tasks: Task[]
  onClose: () => void
  onConfirm: (tasks: Task[]) => Promise<void>
}

export default function TaskModal({
  campaignId,
  title,
  description,
  tasks,
  onClose,
  onConfirm,
}: TaskModalProps) {
  const [taskStates, setTaskStates] = useState(tasks)
  const [loading, setLoading] = useState(false)
  const [twitterConnected, setTwitterConnected] = useState(false)

  // ✅ cek ke backend apakah hunter sudah connect twitter
  useEffect(() => {
    const checkTwitterStatus = async () => {
      try {
        const res = await fetch('/api/connect/twitter/status')
        const data = await res.json()
        if (data.connected) {
          setTwitterConnected(true)
        }
      } catch (err) {
        console.error('Failed to check twitter status', err)
      }
    }
    checkTwitterStatus()

    // ✅ listen pesan dari popup OAuth
    const handleMessage = (event: MessageEvent) => {
  if (event.origin === window.location.origin && event.data?.type === 'TWITTER_CONNECTED') {
    setTwitterConnected(true)
  }
}
    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  const handleVerify = async (idx: number, task: Task) => {
    try {
      setLoading(true)

      // ✅ kalau belum connect twitter → buka popup OAuth
      if (task.service === 'twitter' && !twitterConnected) {
        const res = await fetch('/api/connect/twitter/start')
        const data = await res.json()
        if (data.url) {
          const popup = window.open(
            data.url,
            'ConnectTwitter',
            'width=600,height=700,scrollbars=yes'
          )

          // fallback check kalau popup langsung close
          const timer = setInterval(() => {
            if (popup && popup.closed) {
              clearInterval(timer)
              // cek lagi status twitter
              fetch('/api/connect/twitter/status')
                .then((r) => r.json())
                .then((d) => {
                  if (d.connected) {
                    setTwitterConnected(true)
                  }
                })
            }
          }, 1000)
        }
        return
      }

      // ✅ panggil API verifikasi sesuai task
      const res = await fetch('/api/task/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, task }),
      })
      const data = await res.json()

      if (data.success) {
        const updated = [...taskStates]
        updated[idx].done = true
        setTaskStates(updated)
      } else {
        alert(data.error || 'Verification failed')
      }
    } catch (err) {
      console.error('verify failed', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    try {
      setLoading(true)
      await onConfirm(taskStates)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-gray-800 text-white rounded-xl p-6 w-full max-w-lg">
          <Dialog.Title className="text-lg font-bold mb-4">{title}</Dialog.Title>
          <p className="mb-4 text-gray-300">{description}</p>

          <div className="space-y-3 mb-4">
            {taskStates.map((task, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-700 p-3 rounded"
              >
                <a
                  href={task.url}
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
                    disabled={loading}
                    className="ml-3 px-3 py-1 text-sm rounded bg-green-600 hover:bg-green-700"
                  >
                    {task.service === 'twitter' && !twitterConnected
                      ? 'Connect Twitter'
                      : 'Verify'}
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            className="w-full py-2 rounded font-semibold mt-4"
            style={{ backgroundColor: '#16a34a' }}
            onClick={handleConfirm}
            disabled={loading || !taskStates.every((t) => t.done)}
          >
            Confirm & Submit
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
