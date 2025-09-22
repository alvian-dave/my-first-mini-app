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
  // ⛔ awalnya langsung pake props.tasks
  // ✅ sekarang default [] supaya tunggu fetch submission dulu
  const [taskStates, setTaskStates] = useState<Task[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState<number | null>(null)
  const [twitterConnected, setTwitterConnected] = useState(false)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)

  // ✅ cek status twitter & submission
  useEffect(() => {
    const checkTwitterStatus = async () => {
      try {
        const res = await fetch('/api/connect/twitter/status')
        const data = await res.json()
        if (data.connected) setTwitterConnected(true)
      } catch (err) {
        console.error('Failed to check twitter status', err)
      }
    }

    const fetchSubmission = async () => {
      try {
        const res = await fetch(`/api/submissions?campaignId=${campaignId}`)
        const data = await res.json()
        if (res.ok && data.submission) {
          setTaskStates(data.submission.tasks) // ✅ load dari DB
        } else {
          setTaskStates(tasks) // fallback ke campaign.tasks kalau belum ada submission
        }
      } catch (err) {
        console.error('Failed to load submission', err)
        setTaskStates(tasks) // fallback kalau error
      }
    }

    checkTwitterStatus()
    fetchSubmission()

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'TWITTER_CONNECTED') {
        setTwitterConnected(true)
        setToast({ message: 'Twitter connected successfully!', type: 'success' })
      }
      if (event.data?.type === 'TWITTER_FAILED') {
        setToast({ message: 'Twitter connection failed, please try again.', type: 'error' })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [campaignId, tasks])

  const handleVerify = async (idx: number, task: Task) => {
    try {
      setVerifying(idx)
      if (task.service === 'twitter' && !twitterConnected) {
        const res = await fetch('/api/connect/twitter/start')
        const data = await res.json()
        if (data.url) window.location.href = data.url
        return
      }

      const res = await fetch('/api/task/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, task }),
      })
      const data = await res.json()
      if (data.success && data.submission) {
        // ✅ update langsung pakai submission.tasks
        const merged = tasks.map((t) => {
          const found = data.submission.tasks.find(
            (st: Task) =>
              st.service === t.service &&
              st.type === t.type &&
              st.url === t.url
          )
          return found || { ...t, done: false }
        })
        setTaskStates(merged)
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

  const handleConfirm = async () => {
    if (!taskStates.every((t) => t.done)) {
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
        const merged = tasks.map((t) => {
          const found = submission.tasks.find(
            (st: Task) =>
              st.service === t.service &&
              st.type === t.type &&
              st.url === t.url
          )
          return found || { ...t, done: false }
        })
        setTaskStates(merged)

        onConfirm(submission)
        onClose()
        if (data.alreadyRewarded) {
          setToast({ message: 'You have already received the reward for this campaign.', type: 'success' })
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
          <p className="mb-4 text-gray-300">{description}</p>

          <div className="space-y-3 mb-4">
            {taskStates.map((task, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center gap-2"
                >
                  <span>{task.service.toUpperCase()} — {task.type}</span>
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

          {/* ✅ Toast */}
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
