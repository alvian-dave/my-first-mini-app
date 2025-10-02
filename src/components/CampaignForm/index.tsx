'use client'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { Campaign as CampaignType } from '@/types'

const MAX_TASKS = 3
const SERVICE_OPTIONS = [
  { service: 'twitter', label: 'Twitter/X' },
  { service: 'discord', label: 'Discord' },
  { service: 'telegram', label: 'Telegram' },
]

const TASK_TYPE_OPTIONS: Record<
  string,
  { value: string; label: string; disabled?: boolean }[]
> = {
  twitter: [
    { value: 'follow', label: 'Follow' },
    { value: 'retweet', label: 'Retweet' },
    { value: 'like', label: 'Like' },
  ],
  discord: [
    { value: 'join', label: 'Join Group', disabled: true },
    { value: 'comment', label: 'Comment in Group', disabled: true },
  ],
  telegram: [
    { value: 'join_channel', label: 'Join Channel' },
    { value: 'join_group', label: 'Join Group' },
    { value: 'comment_group', label: 'Comment in Group', disabled: true },
  ],
}

interface Task {
  service: 'twitter' | 'discord' | 'telegram' | ''
  type: string
  url: string
  isOld?: boolean
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (campaign: CampaignType) => void | Promise<void>
  editingCampaign: CampaignType | null
  setEditingCampaign: (c: CampaignType | null) => void
}

export const CampaignForm = ({
  isOpen,
  onClose,
  onSubmit,
  editingCampaign,
  setEditingCampaign,
}: Props) => {
  const [campaign, setCampaign] = useState<CampaignType>({
    id: Date.now(),
    title: '',
    description: '',
    budget: '',
    reward: '',
    status: 'active',
    tasks: [],
  })

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (editingCampaign) {
      setCampaign({
        ...editingCampaign,
        budget: editingCampaign.budget ?? '',
        reward: editingCampaign.reward ?? '',
        tasks: (editingCampaign.tasks ?? []).map((t) => ({
          ...t,
          isOld: true,
        })),
      })
    } else {
      setCampaign({
        id: Date.now(),
        title: '',
        description: '',
        budget: '',
        reward: '',
        status: 'active',
        tasks: [],
      })
    }
  }, [editingCampaign])

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  const handleChange = (key: keyof CampaignType, value: any) => {
    setCampaign((prev) => ({ ...prev, [key]: value }))
  }

  const updateTask = (
    index: number,
    key: 'service' | 'type' | 'url',
    value: string
  ) => {
    const newTasks = [...(campaign.tasks || [])]
    if (!newTasks[index]) newTasks[index] = { service: '', type: '', url: '' }

    if (key === 'service') {
      newTasks[index][key] = value as '' | 'twitter' | 'discord' | 'telegram'
      // reset type & url when service changed
      newTasks[index].type = ''
      newTasks[index].url = ''
    } else {
      newTasks[index][key] = value
    }

    setCampaign({ ...campaign, tasks: newTasks })
  }

  const removeTask = (index: number) => {
    const newTasks = [...(campaign.tasks || [])]
    newTasks.splice(index, 1)
    setCampaign({ ...campaign, tasks: newTasks })
  }

  const handleSubmit = async () => {
    if (!campaign.title.trim()) {
      setErrorMessage('Title is required')
      return
    }
    if (!campaign.description.trim()) {
      setErrorMessage('Description is required')
      return
    }

    // ✅ Check Telegram tasks verification
    for (const t of campaign.tasks) {
      if (t.service === 'telegram' && (t.type === 'join_group' || t.type === 'join_channel')) {
        try {
          const res = await fetch('/api/connect/telegram/verifyGroup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: t.url }),
          })
          const data = await res.json()
          if (!res.ok || !data.valid) {
            setErrorMessage(
              '⚠️ Please make sure you have added our bot @myplatform_bot to your group/channel before publishing this campaign.'
            )
            return
          }
        } catch (err) {
          console.error('verifyTelegram error:', err)
          setErrorMessage('Failed to verify Telegram group/channel. Please try again.')
          return
        }
      }
    }

    const rewardPerTask = parseFloat(campaign.reward || '0')
    const totalBudget = parseFloat(campaign.budget || '0')

    if (rewardPerTask < 10) {
      setErrorMessage('Reward per task cannot be less than 10')
      return
    }

    if (rewardPerTask > totalBudget) {
      setErrorMessage('Reward cannot be greater than total budget')
      return
    }

    await onSubmit(campaign)
    setEditingCampaign(null)
    onClose()
  }

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4">
              <Dialog.Panel className="relative w-full max-w-lg bg-gray-800 text-white rounded-xl p-6 max-h-[90vh] flex flex-col">
                <Dialog.Title className="text-xl font-bold mb-4">
                  {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
                </Dialog.Title>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  <input
                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 placeholder-gray-400 text-white"
                    placeholder="Campaign Title"
                    value={campaign.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                  />

                  <textarea
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 placeholder-gray-400 text-white"
                    placeholder="Description"
                    value={campaign.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                  />

                  <input
                    type="number"
                    min={0}
                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 placeholder-gray-400 text-white"
                    placeholder="Total Budget (e.g. 1000 WR)"
                    value={campaign.budget || ''}
                    onChange={(e) => handleChange('budget', e.target.value)}
                  />

                  <input
                    type="number"
                    min={0}
                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 placeholder-gray-400 text-white"
                    placeholder="Reward per Task (e.g. 10 WR)"
                    value={campaign.reward || ''}
                    onChange={(e) => handleChange('reward', e.target.value)}
                  />

                  <div className="space-y-3">
                    {(campaign.tasks || []).map((task, i) => {
                      let urlPlaceholder = 'Paste target URL (e.g. profile link)'
                      if (task.service === 'twitter') {
                        if (task.type === 'follow') {
                          urlPlaceholder =
                            'Paste profile URL (e.g. https://twitter.com/username)'
                        } else if (
                          task.type === 'like' ||
                          task.type === 'retweet'
                        ) {
                          urlPlaceholder =
                            'Paste tweet URL (e.g. https://twitter.com/username/status/123456)'
                        }
                      }
                      if (task.service === 'telegram') {
                        if (task.type === 'join_group') {
                          urlPlaceholder =
                            'Paste Telegram group URL (e.g. https://t.me/groupname)'
                        } else if (task.type === 'join_channel') {
                          urlPlaceholder =
                            'Paste Telegram channel URL (e.g. https://t.me/channelname)'
                        }
                      }

                      return (
                        <div
                          key={i}
                          className="bg-gray-700 p-3 rounded flex flex-col gap-2"
                        >
                          <select
                            value={task.service}
                            onChange={(e) =>
                              updateTask(i, 'service', e.target.value)
                            }
                            className="bg-gray-600 rounded p-2"
                          >
                            <option value="">Select Service</option>
                            {SERVICE_OPTIONS.map((s) => (
                              <option key={s.service} value={s.service}>
                                {s.label}
                              </option>
                            ))}
                          </select>

                          {task.service && (
                            <select
                              value={task.type}
                              onChange={(e) =>
                                updateTask(i, 'type', e.target.value)
                              }
                              className="bg-gray-600 rounded p-2"
                            >
                              <option value="">Select Task Type</option>
                              {TASK_TYPE_OPTIONS[task.service].map((t) => (
                                <option
                                  key={t.value}
                                  value={t.value}
                                  disabled={t.disabled}
                                >
                                  {t.label}{' '}
                                  {t.disabled ? '(Coming Soon)' : ''}
                                </option>
                              ))}
                            </select>
                          )}

                          <input
                            className="bg-gray-600 rounded p-2 text-white"
                            placeholder={urlPlaceholder}
                            value={task.url}
                            onChange={(e) =>
                              updateTask(i, 'url', e.target.value)
                            }
                            readOnly={task.isOld}
                            style={
                              task.isOld
                                ? { opacity: 0.6, cursor: 'not-allowed' }
                                : {}
                            }
                          />

                          {/* Telegram Helper Message */}
                          {task.service === 'telegram' &&
                            (task.type === 'join_group' ||
                              task.type === 'join_channel') && (
                              <p className="text-yellow-400 text-sm">
                                ⚠️ Please make sure you have added our bot{' '}
                                <span className="font-semibold">
                                  @myplatform_bot
                                </span>{' '}
                                to your group/channel before publishing this
                                campaign.
                              </p>
                            )}

                          <button
                            onClick={() => removeTask(i)}
                            className="px-3 py-1 bg-red-600 rounded hover:bg-red-700"
                          >
                            Remove Task
                          </button>
                        </div>
                      )
                    })}

                    {campaign.tasks.length < MAX_TASKS && (
                      <button
                        onClick={() =>
                          handleChange('tasks', [
                            ...(campaign.tasks || []),
                            { service: '', type: '', url: '', isOld: false },
                          ])
                        }
                        className="px-3 py-2 rounded font-medium transition hover:brightness-110"
                        style={{ backgroundColor: '#2563eb', color: '#fff' }}
                      >
                        + Add Task
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 mt-4 border-t border-gray-700">
                  <button
                    onClick={handleSubmit}
                    className="flex-1 py-2 rounded font-medium transition hover:brightness-110"
                    style={{ backgroundColor: '#16a34a', color: '#fff' }}
                  >
                    {editingCampaign ? 'Update Campaign' : 'Publish'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingCampaign(null)
                      onClose()
                    }}
                    className="flex-1 py-2 rounded font-medium transition hover:brightness-110"
                    style={{ backgroundColor: '#4b5563', color: '#fff' }}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </Transition.Child>
        </Dialog>
      </Transition>

      <Transition
        show={!!errorMessage}
        as={Fragment}
        enter="transform ease-out duration-300"
        enterFrom="translate-y-4 opacity-0"
        enterTo="translate-y-0 opacity-100"
        leave="transform ease-in duration-200"
        leaveFrom="translate-y-0 opacity-100"
        leaveTo="translate-y-4 opacity-0"
      >
        <div className="fixed bottom-4 right-4 z-[100]">
          <div className="bg-red-600 text-white px-4 py-2 rounded shadow-lg">
            {errorMessage}
          </div>
        </div>
      </Transition>
    </>
  )
}
