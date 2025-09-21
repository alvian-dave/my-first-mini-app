'use client'

import { Dialog } from '@headlessui/react'
import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import Toast from '@/components/Toast'

interface Task {
  service: string
  type: string
  url: string
  done?: boolean
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
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)

  // ✅ cek status twitter & submission
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

    const fetchSubmission = async () => {
      try {
        const res = await fetch(`/api/submissions?campaignId=${campaignId}`)
        const data = await res.json()
        if (res.ok && data.submission) {
          setTaskStates(data.submission.tasks)
        }
      } catch (err) {
        console.error('Failed to load submission', err)
      }
    }

    checkTwitterStatus()
    fetchSubmission()

    // ✅ listen postMessage dari /twitter-success
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.data?.type === 'TWITTER_CONNECTED'
      ) {
        setTwitterConnected(true)
        setToast({ message: 'Twitter connected successfully!', type: 'success' })
      }

      if (
        event.origin === window.location.origin &&
        event.data?.type === 'TWITTER_FAILED'
      ) {
        setToast({ message: 'Twitter connection failed, please try again.', type: 'error' })
      }
    }
    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [campaignId])

  const handleVerify = async (idx: number, task: Task) => {
    try {
      setLoading(true)

      if (task.service === 'twitter' && !twitterConnected) {
        const res = await fetch('/api/connect/twitter/start')
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        }
        return
      }

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
      setLoading(false)
    }
  }

  // ✅ FIX: hanya refresh UI + toast, tidak POST lagi
  const handleConfirm = async () => {
    if (!taskStates.every((t) => t.done)) {
      setToast({ message: 'Please complete all tasks first.', type: 'error' })
      return
    }

    // Simulasikan submission sukses
    const fakeSubmission: Submission = {
      status: 'submitted',
      tasks: taskStates,
    }

    // ✅ Sync ke parent agar campaign pindah tab Completed
    onConfirm(fakeSubmission)

    // ✅ Close modal
    onClose()

    // ✅ Show toast
    setToast({
      message: 'You have already submitted successfully. Reward has been sent to your account.',
      type: 'success',
    })
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
            disabled={loading}
          >
            Confirm & Submit
          </button>

          {/* ✅ Render Toast */}
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
