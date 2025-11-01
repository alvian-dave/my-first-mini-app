'use client'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { Campaign as CampaignType } from '@/types'
import { MiniKit } from '@worldcoin/minikit-js'
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'
import WRABI from '@/abi/WRCredit.json'
import { useSession } from 'next-auth/react'
import { createPublicClient, http } from 'viem'
import { worldchain } from 'viem/chains'
import { parseUnits } from "ethers"

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
    { value: 'join', label: 'Join Discord Server' },
    { value: 'comment', label: 'Comment in Discord', disabled: true },
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

  // toast / notification states
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [transactionId, setTransactionId] = useState<string>('')
  const isEditing = !!editingCampaign
  
  const { data: session } = useSession()
  const userAddress = session?.user?.walletAddress || ''

    const client = createPublicClient({
    chain: worldchain,
    transport: http('https://worldchain-mainnet.g.alchemy.com/public'),
  })

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    client,
    appConfig: { app_id: process.env.NEXT_PUBLIC_APP_ID || '' },
    transactionId,
  })

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

  // ============================================================
  // 🧾 Step 4: Save campaign to backend
  // ============================================================

    useEffect(() => {
    if (!isConfirmed || !transactionId) return

    const saveCampaign = async () => {
      try {
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...campaign, depositTxHash: transactionId, userAddress }),
        })

    const data = await res.json()
    if (!res.ok) {
      console.error('Backend error:', data)
      setErrorMessage('Failed to publish campaign.')
    } else {
      setSuccessMessage('Campaign published successfully!')
      setEditingCampaign(null)
        if (onSubmit) {
    onSubmit(data.record) // data.record = campaign baru dari backend
  }

      setTimeout(() => {
        setPublishing(false)
        onClose()
      }, 1000)
    }
  } catch (err) {
    console.error('publish error', err)
    setErrorMessage('Failed to publish campaign. Please try again.')
  } finally {
    setPublishing(false)
  }
}
    saveCampaign()
  }, [isConfirmed, transactionId]) 
   

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

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

  // build invite link from env - client needs NEXT_PUBLIC_*
  const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? '1393523002750140446'
  const DISCORD_PERMISSIONS = process.env.NEXT_PUBLIC_DISCORD_BOT_PERMISSIONS ?? '8'
  const DISCORD_INVITE_URL =
    DISCORD_CLIENT_ID.length > 0
      ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(
          DISCORD_CLIENT_ID
        )}&permissions=${encodeURIComponent(DISCORD_PERMISSIONS)}&scope=bot`
      : '#'

  const handleSubmit = async () => {
    if (!campaign.title.trim()) {
      setErrorMessage('Title is required')
      return
    }
    if (!campaign.description.trim()) {
      setErrorMessage('Description is required')
      return
    }
  
  if (!campaign.tasks || campaign.tasks.length === 0) {
    setErrorMessage('At least one task is required')
    return
  }

  for (const [index, t] of campaign.tasks.entries()) {
    if (!t.service || !t.type || !t.url) {
      setErrorMessage(`Task #${index + 1} is incomplete`)
      return
    }
  }  

    setPublishing(true)
    


    for (const t of campaign.tasks) {

    // ✅ cek url twitter

      if (t.service === 'twitter') {
  try {
    const u = new URL(t.url)

    if (!u.hostname.includes('twitter.com') && !u.hostname.includes('x.com')) {
      throw new Error('Invalid domain')
    }

    if (t.type === 'follow') {
  try {
    const res = await fetch("/api/connect/twitter/verifyUrl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: t.url }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Invalid Twitter profile")
    t.targetId = data.userId // simpan targetId di campaign task
  } catch (err) {
    setErrorMessage(`⚠️ Invalid Twitter profile URL for task "${t.type}": ${String(err)}`)
    setPublishing(false)
    return
  }
}
    if (t.type === 'retweet' || t.type === 'like') {
      const parts = u.pathname.split('/')
      const tweetId = parts.find((p) => /^\d+$/.test(p))
      if (!tweetId) throw new Error('No tweet ID in URL')
    }

  } catch (err) {
    setErrorMessage(`⚠️ Invalid Twitter/X URL for task "${t.type}" — ${String(err)}`)
    setPublishing(false)
    return
  }
}

      // ✅ Check Telegram tasks verification (unchanged)
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
              '⚠️ Please make sure you have added our bot @WR_PlatformBot to your group/channel before publishing this campaign.'
            )
            setPublishing(false)
            return
          }
        } catch (err) {
          console.error('verifyTelegram error:', err)
          setErrorMessage('Failed to verify Telegram group/channel. Please try again.')
          setPublishing(false)
          return
        }
      }

      // ✅ Discord task verification
      if (t.service === 'discord' && t.type === 'join') {
        try {
          const res = await fetch('/api/connect/discord/verifyServer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: t.url }),
          })
          const data = await res.json()
          if (!res.ok || !data.valid) {
            // English toast advising to invite bot
            setErrorMessage(
              '⚠️ Please invite the WR Platform Bot to your Discord server (use "Add WR Platform Bot to Server" button) and try again.'
            )
            setPublishing(false)
            return
          }
        } catch (err) {
          console.error('verifyDiscord error:', err)
          setErrorMessage('Failed to verify Discord server. Please try again.')
          setPublishing(false)
          return
        }
      }
    }
    

    const rewardPerTask = parseFloat(campaign.reward || '0')
    const totalBudget = parseFloat(campaign.budget || '0')

    if (rewardPerTask < 10) {
      setErrorMessage('Reward per task cannot be less than 10')
      setPublishing(false)
      return
    }

    if (rewardPerTask > totalBudget) {
      setErrorMessage('Reward cannot be greater than total budget')
      setPublishing(false)
      return
    }


  // ============================================================
  // 🪙 Step 3: Transfer WR tokens using MiniKit
  // ============================================================
  if (!isEditing) {
  const txId = await sendWRTransfer()
  if (!txId) {
    setPublishing(false)
    return
  }
  setTransactionId(txId)
}
try {
    const endpoint = isEditing ? `/api/campaigns/${campaign._id}` : '/api/campaigns'
    const method = isEditing ? 'PUT' : 'POST'
    const body: any = { ...campaign }
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  const data = await res.json()

  if (!res.ok && !data.ok) {
    setErrorMessage(data.message || 'Failed to save campaign')
    return
  }

  setSuccessMessage(
    isEditing
      ? 'Your campaign successfully updated'
      : 'Campaign successfully published'
  )

    if (onSubmit) {
    await onSubmit(data)
  }

} catch (err) {
  console.error('Failed to save campaign', err)
  setErrorMessage('An unexpected error occurred.')

  } finally {
    setPublishing(false)
  }
}
// ============================================================
// 🪙 STEP 1: Send WR transfer transaction via MiniKit dipanggil setelah verifikasi form selesai
// ============================================================
const sendWRTransfer = async (): Promise<string | null> => {
  try {
    const wrAddress = process.env.NEXT_PUBLIC_WR_CONTRACT!
    const campaignContract = process.env.NEXT_PUBLIC_WR_ESCROW! // sementara ke kontrak WR juga
    const amount = parseUnits(campaign.budget.toString(), 18).toString()

    const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: wrAddress,
          abi: WRABI,
          functionName: 'transfer',
          args: [campaignContract, amount],
        },
      ],
    })

    if (finalPayload.status === 'error') {
      console.error('Transfer failed:', finalPayload)
      setErrorMessage('Transaction failed. Please try again.')
      return null
    }

    console.log('✅ WR transferred successfully:', finalPayload.transaction_id)
    return finalPayload.transaction_id
  } catch (err) {
    console.error('Error sending WR:', err)
    setErrorMessage('Failed to send WR transaction.')
    return null
  }
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
                    disabled={isEditing}
                  />

                  <input
                    type="number"
                    min={0}
                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 placeholder-gray-400 text-white"
                    placeholder="Reward per Task (e.g. 10 WR)"
                    value={campaign.reward || ''}
                    onChange={(e) => handleChange('reward', e.target.value)}
                    disabled={isEditing}
                  />

                  <div className="space-y-3">
                    {(campaign.tasks || []).map((task, i) => {
                      let urlPlaceholder = 'Paste target URL (e.g. profile link)'
                      if (task.service === 'twitter') {
                        if (task.type === 'follow') {
                          urlPlaceholder = 'Paste profile URL (e.g. https://twitter.com/username)'
                        } else if (task.type === 'like' || task.type === 'retweet') {
                          urlPlaceholder = 'Paste tweet URL (e.g. https://twitter.com/username/status/123456)'
                        }
                      } else if (task.service === 'telegram') {
                        if (task.type === 'join_group') {
                          urlPlaceholder = 'Paste Telegram group URL (e.g. https://t.me/groupname)'
                        } else if (task.type === 'join_channel') {
                          urlPlaceholder = 'Paste Telegram channel URL (e.g. https://t.me/channelname)'
                        }
                      } else if (task.service === 'discord') {
                        if (task.type === 'join') {
                          urlPlaceholder = 'Paste Discord server invite URL (e.g. https://discord.gg/yourserver)'
                        }
                      }

                      return (
                        <div
                          key={i}
                          className="bg-gray-700 p-3 rounded flex flex-col gap-2"
                        >
                          <select
                            value={task.service}
                            onChange={(e) => updateTask(i, 'service', e.target.value)}
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
                              onChange={(e) => updateTask(i, 'type', e.target.value)}
                              className="bg-gray-600 rounded p-2"
                            >
                              <option value="">Select Task Type</option>
                              {TASK_TYPE_OPTIONS[task.service].map((t) => (
                                <option
                                  key={t.value}
                                  value={t.value}
                                  disabled={t.disabled}
                                >
                                  {t.label} {t.disabled ? '(Coming Soon)' : ''}
                                </option>
                              ))}
                            </select>
                          )}

                          <input
                            className="bg-gray-600 rounded p-2 text-white"
                            placeholder={urlPlaceholder}
                            value={task.url}
                            onChange={(e) => updateTask(i, 'url', e.target.value)}
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
                                <span className="font-semibold">@WR_PlatformBot</span>{' '}
                                to your group/channel before publishing this campaign.
                              </p>
                            )}

                          {/* Discord Helper Message + Invite Button */}
                          {task.service === 'discord' && task.type === 'join' && (
                            <>
                              <p className="text-yellow-400 text-sm">
                                ⚠️ Please invite the WR Platform Bot to your Discord server before publishing this campaign.
                                Use the button below to add the bot to your server.
                              </p>

                              <div className="flex gap-2">
                                <a
                                  href={DISCORD_INVITE_URL}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1 bg-indigo-600 rounded hover:bg-indigo-700 text-white text-sm"
                                >
                                  Add WR Platform Bot to Server
                                </a>

                                <button
                                  onClick={async () => {
                                    // quick check button for promoter convenience (optional)
                                    try {
                                      setPublishing(true)
                                      const res = await fetch('/api/connect/discord/verifyServer', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ url: task.url }),
                                      })
                                      const data = await res.json()
                                      if (!res.ok || !data.valid) {
                                        setErrorMessage(
                                          '⚠️ Bot is not present in the server yet. Please invite the WR Platform Bot and try again.'
                                        )
                                      } else {
                                        setSuccessMessage('Bot successfully verified in server.')
                                      }
                                    } catch (err) {
                                      console.error('quick verifyDiscord error:', err)
                                      setErrorMessage('Failed to verify Discord server. Please try again.')
                                    } finally {
                                      setPublishing(false)
                                    }
                                  }}
                                  className="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-white text-sm"
                                >
                                  Verify Bot Presence
                                </button>
                              </div>
                            </>
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
                    disabled={publishing}
                    className="flex-1 py-2 rounded font-medium transition hover:brightness-110 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#16a34a', color: '#fff' }}
                  >
                    {publishing ? 'Publishing...' : editingCampaign ? 'Update Campaign' : 'Publish'}
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

      {/* Error toast (simple) */}
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

      {/* Success toast */}
      <Transition
        show={!!successMessage}
        as={Fragment}
        enter="transform ease-out duration-300"
        enterFrom="translate-y-4 opacity-0"
        enterTo="translate-y-0 opacity-100"
        leave="transform ease-in duration-200"
        leaveFrom="translate-y-0 opacity-100"
        leaveTo="translate-y-4 opacity-0"
      >
        <div className="fixed bottom-4 left-4 z-[100]">
          <div className="bg-green-600 text-white px-4 py-2 rounded shadow-lg">
            {successMessage}
          </div>
        </div>
      </Transition>
    </>
  )
}
