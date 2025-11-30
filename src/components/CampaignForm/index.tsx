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
import { Plus, Trash2, Loader2, Link as LinkIcon, AlertTriangle, CheckCircle, Bot } from 'lucide-react'
import { toast } from 'sonner' 

// shadcn/ui components
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
// Perlu diingat: Shadcn Select biasanya sudah mobile-friendly, namun kita pastikan container-nya juga responsif
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  targetId?: string
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
  
  // Fungsi Sonner Toast
  const showToast = (message: string, type: 'success' | 'error') => {
      if (type === 'success') {
          toast.success(message, { duration: 3000 })
      } else {
          toast.error(message, { 
              duration: 5000, 
              icon: <AlertTriangle className="h-4 w-4 text-white" />,
              style: { backgroundColor: '#dc2626', color: 'white' }
          })
      }
  }

  // Effect untuk inisialisasi/reset form
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
  // 🧾 Step 4: Save campaign to backend (Dipanggil setelah isConfirmed)
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
        showToast('Failed to publish campaign.', 'error')
      } else {
        showToast('Campaign published successfully!', 'success')
        setEditingCampaign(null)

        setCampaign({
          id: Date.now(),
          title: '',
          description: '',
          budget: '',
          reward: '',
          status: 'active',
          tasks: [],
        })
              
        if (onSubmit) {
          onSubmit(data.record)
        }
        
        setTimeout(() => {
          setPublishing(false)
          onClose()
        }, 1000)
      }
    } catch (err) {
      console.error('publish error', err)
      showToast('Failed to publish campaign. Please try again.', 'error')
    } finally {
      setPublishing(false)
    }
  }
    saveCampaign()
  }, [isConfirmed, transactionId, userAddress]) 
    
  const handleChange = (key: keyof CampaignType, value: any) => {
    setCampaign((prev) => ({ ...prev, [key]: value }))
  }

  const updateTask = (
    index: number,
    key: 'service' | 'type' | 'url',
    value: string
  ) => {
    const newTasks = [...(campaign.tasks || [])]
    if (!newTasks[index]) newTasks[index] = { service: '', type: '', url: '' } as Task

    if (key === 'service') {
      newTasks[index][key] = value as '' | 'twitter' | 'discord' | 'telegram'
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

  // ============================================================
  // 🪙 STEP 1: Send WR transfer transaction via MiniKit
  // ============================================================
  const sendWRTransfer = async (): Promise<string | null> => {
    try {
      const wrAddress = process.env.NEXT_PUBLIC_WR_CONTRACT!
      const campaignContract = process.env.NEXT_PUBLIC_WR_ESCROW! 
      const amount = parseUnits(campaign.budget.toString(), 18).toString()

      toast.info('Sending WR transfer transaction via MiniKit. Please confirm in your wallet.', { duration: 5000 })

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
        const errorMessage = (finalPayload as any).error || JSON.stringify(finalPayload);
        showToast(`Transaction failed: ${errorMessage}`, 'error')
        return null
      }

      console.log('✅ WR transferred successfully:', finalPayload.transaction_id)
      return finalPayload.transaction_id
    } catch (err) {
      console.error('Error sending WR:', err)
      showToast('Failed to send WR transaction.', 'error')
      return null
    }
  }


  const handleSubmit = async () => {
    // --- 1. Validation Logic ---
    if (!campaign.title.trim()) {
      showToast('Title is required', 'error')
      return
    }
    if (!campaign.description.trim()) {
      showToast('Description is required', 'error')
      return
    }
  
    if (!campaign.tasks || campaign.tasks.length === 0) {
      showToast('At least one task is required', 'error')
      return
    }

    for (const [index, t] of campaign.tasks.entries()) {
      if (!t.service || !t.type || !t.url) {
        showToast(`Task #${index + 1} is incomplete. Fill in Service, Type, and URL.`, 'error')
        return
      }
    } 	

    setPublishing(true)
    
    // --- 2. Verification Logic ---
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
              t.targetId = data.userId
            } catch (err) {
              showToast(`⚠️ Invalid Twitter profile URL for task "${t.type}": ${String(err)}`, 'error')
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
          showToast(`⚠️ Invalid Twitter/X URL for task "${t.type}" — ${String(err)}`, 'error')
          setPublishing(false)
          return
        }
      }

      // ✅ Check Telegram tasks verification
      if (t.service === 'telegram' && (t.type === 'join_group' || t.type === 'join_channel')) {
        try {
          const res = await fetch('/api/connect/telegram/verifyGroup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: t.url }),
          })
          const data = await res.json()
          if (!res.ok || !data.valid) {
            showToast(
              '⚠️ Please make sure you have added our bot @WR_PlatformBot to your group/channel before publishing this campaign.',
              'error'
            )
            setPublishing(false)
            return
          }
        } catch (err) {
          console.error('verifyTelegram error:', err)
          showToast('Failed to verify Telegram group/channel. Please try again.', 'error')
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
            showToast(
              '⚠️ Please invite the WR Platform Bot to your Discord server (use "Add WR Platform Bot to Server" button) and try again.',
              'error'
            )
            setPublishing(false)
            return
          }
        } catch (err) {
          console.error('verifyDiscord error:', err)
          showToast('Failed to verify Discord server. Please try again.', 'error')
          setPublishing(false)
          return
        }
      }
    }
    
    // Check Budget and Reward
    const rewardPerTask = parseFloat(campaign.reward || '0')
    const totalBudget = parseFloat(campaign.budget || '0')

    if (rewardPerTask < 10) {
      showToast('Reward per task cannot be less than 10 WR', 'error')
      setPublishing(false)
      return
    }

    if (rewardPerTask > totalBudget) {
      showToast('Reward per task cannot be greater than total budget', 'error')
      setPublishing(false)
      return
    }

    // --- 3. Transaction / API Call ---
    if (!isEditing) {
      // 3a. New Campaign: Send WR token (on-chain step)
      const txId = await sendWRTransfer()
      if (!txId) {
        setPublishing(false)
        return
      }
      setTransactionId(txId)
      return 
    }
    
    // 3b. Editing Campaign: Direct API Call
    try {
      const endpoint = isEditing ? `/api/campaigns/${campaign.id}` : '/api/campaigns' 
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast('Failed to update campaign.', 'error')
        return
      }

      showToast('Campaign updated successfully!', 'success')
      if (onSubmit) {
        await onSubmit(data.record || data)
      }
      setEditingCampaign(null)
      setTimeout(() => onClose(), 1000)

    } catch (err) {
      console.error('Failed to save campaign', err)
      showToast('Failed to update campaign. Please try again.', 'error')
    } finally {
      setPublishing(false)
    }
  }


  // --- UI RENDERING (Headless UI + Shadcn) ---

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              {/* Modal Content (Shadcn styling) */}
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-card p-6 text-left align-middle shadow-xl transition-all border border-border">
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-bold leading-6 text-foreground mb-4"
                >
                  {editingCampaign ? 'Edit Campaign' : 'Create New Campaign ✍️'}
                </Dialog.Title>

                <div className="space-y-6 pt-2 pb-4 max-h-[70vh] overflow-y-auto pr-2">
                  {/* Campaign Info */}
                  <div className="space-y-4">
                      <Label htmlFor="title">Campaign Title</Label>
                      <Input
                          id="title"
                          placeholder="e.g., Launch Event Promo"
                          value={campaign.title}
                          onChange={(e) => handleChange('title', e.target.value)}
                          className="bg-background"
                      />
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                          id="description"
                          rows={3}
                          placeholder="Detailed steps and objective of the campaign."
                          value={campaign.description}
                          onChange={(e) => handleChange('description', e.target.value)}
                          className="bg-background"
                      />

                      <div className="flex gap-4">
                          <div className="flex-1 space-y-2">
                              <Label htmlFor="budget">Total Budget (WR)</Label>
                              <Input
                                  id="budget"
                                  type="number"
                                  min={0}
                                  placeholder="e.g., 1000 WR"
                                  value={campaign.budget || ''}
                                  onChange={(e) => handleChange('budget', e.target.value)}
                                  disabled={isEditing}
                                  className={`bg-background ${isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                              />
                          </div>
                          <div className="flex-1 space-y-2">
                              <Label htmlFor="reward">Reward per Task (WR)</Label>
                              <Input
                                  id="reward"
                                  type="number"
                                  min={0}
                                  placeholder="e.g., 10 WR"
                                  value={campaign.reward || ''}
                                  onChange={(e) => handleChange('reward', e.target.value)}
                                  disabled={isEditing}
                                  className={`bg-background ${isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                              />
                          </div>
                      </div>
                  </div>

                  {/* Task List */}
                  <h4 className="text-lg font-semibold border-b pb-2 mb-4 text-foreground">Tasks ({campaign.tasks.length}/{MAX_TASKS})</h4>
                  <div className="space-y-4">
                    {(campaign.tasks || []).map((task, i) => {
                      let urlPlaceholder = 'Paste target URL (e.g. profile link)'
                      // Placeholder logic for tasks (unchanged)
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
                          className={`bg-muted/30 p-4 rounded-lg space-y-3 border ${task.isOld ? 'border-primary/50' : 'border-border'}`}
                        >
                          <h5 className="text-sm font-medium text-foreground/80">Task #{i + 1} {task.isOld && <span className="text-xs text-primary/80">(Existing)</span>}</h5>

                          {/* FIX 1: Ubah dari grid 2 kolom menjadi tumpukan untuk mobile */}
                          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
                            {/* Service Select */}
                            <Select 
                              onValueChange={(val) => updateTask(i, 'service', val)} 
                              value={task.service}
                            >
                              <SelectTrigger className="bg-background" disabled={task.isOld}>
                                <SelectValue placeholder="Select Service" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover">
                                {SERVICE_OPTIONS.map((s) => (
                                  <SelectItem key={s.service} value={s.service}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Type Select */}
                            {task.service && (
                              <Select 
                                onValueChange={(val) => updateTask(i, 'type', val)} 
                                value={task.type}
                              >
                                <SelectTrigger className="bg-background" disabled={task.isOld}>
                                  <SelectValue placeholder="Select Task Type" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                  {TASK_TYPE_OPTIONS[task.service]?.map((t) => (
                                    <SelectItem 
                                      key={t.value} 
                                      value={t.value} 
                                      disabled={t.disabled}
                                    >
                                      {t.label} {t.disabled ? '(Coming Soon)' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          {/* URL Input */}
                          <div className="relative">
                            <Input
                              className={`bg-background pl-8 ${task.isOld ? 'opacity-70 cursor-not-allowed' : ''}`}
                              placeholder={urlPlaceholder}
                              value={task.url}
                              onChange={(e) => updateTask(i, 'url', e.target.value)}
                              readOnly={task.isOld}
                            />
                            <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>

                          {/* Verification Helpers: Telegram */}
                          {task.service === 'telegram' &&
                            (task.type === 'join_group' ||
                              task.type === 'join_channel') && (
                                <div className="p-3 rounded-md bg-yellow-900/50 border border-yellow-500/50 text-yellow-400 text-sm flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <p>
                                    Please make sure you have added our bot{' '}
                                    <span className="font-semibold text-white">@WR_PlatformBot</span>{' '}
                                    to your group/channel before publishing this campaign.
                                  </p>
                                </div>
                              )}


                          {/* Verification Helpers: Discord */}
                          {task.service === 'discord' && task.type === 'join' && (
                            // FIX: Warna warning diubah ke kuning/amber dan tombol dioptimalkan
                            <div className="p-3 rounded-md bg-amber-900/50 border border-amber-500/50 space-y-3">
                              <p className="text-amber-400 text-sm flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <span className="text-white">
                                    **Penting:** Harap undang **WR Platform Bot** ke server Discord Anda untuk memverifikasi.
                                  </span>
                              </p>
                              {/* Tata letak tombol diubah: tumpukan di mobile, berdampingan di desktop */}
                              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                                <Button
                                  asChild
                                  variant="secondary"
                                  size="sm"
                                  // FIX: Warna tombol Add Bot diubah menjadi primary untuk penekanan
                                  className="bg-primary hover:bg-primary/90 text-white flex-1 font-bold shadow-md"
                                >
                                  <a
                                    href={DISCORD_INVITE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Bot className="h-4 w-4 mr-2" />
                                    Add WR Platform Bot to Server
                                  </a>
                                </Button>
                                <Button
                                  onClick={async () => {
                                    // ... (Logic verifikasi)
                                  }}
                                  // FIX: Tombol Verify diubah menjadi 'outline' dengan warna hijau yang lebih jelas
                                  variant="outline"
                                  size="sm"
                                  className="border-green-500 text-green-500 hover:bg-green-500/10 flex-1 font-semibold"
                                  disabled={publishing}
                                >
                                  Verify Bot Presence
                                </Button>
                              </div>
                            </div>
                          )}


                          {/* Remove Button */}
                          {!task.isOld && (
                              <Button
                                  onClick={() => removeTask(i)}
                                  variant="destructive"
                                  size="sm"
                                  className="w-full mt-2"
                              >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Task
                              </Button>
                          )}
                        </div>
                      )
                    })}

                    {/* Add Task Button */}
                    {campaign.tasks.length < MAX_TASKS && (
                      <Button
                        onClick={() =>
                          handleChange('tasks', [
                            ...(campaign.tasks || []),
                            { service: '', type: '', url: '', isOld: false },
                          ])
                        }
                        variant="outline"
                        className="w-full border-dashed border-primary text-primary hover:bg-primary/10"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    )}
                  </div>
                </div>

                {/* Footer & Action Buttons */}
                <div className="mt-6 flex gap-3 border-t pt-4 border-border">
                  <Button
                    onClick={handleSubmit}
                    disabled={publishing}
                    className="flex-1 h-10 bg-primary hover:bg-primary/90"
                  >
                    {publishing ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...</>
                    ) : (
                      editingCampaign ? 'Update Campaign' : 'Publish Campaign'
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingCampaign(null)
                      onClose()
                    }}
                    variant="secondary"
                    disabled={publishing}
                    className="flex-1 h-10"
                  >
                    Cancel
                  </Button>
                </div>
                
                {/* Transaction Status Indicator */}
                {transactionId && (
                  <div className="mt-4 flex items-center justify-center text-sm font-medium">
                      {isConfirming && (
                          <span className="flex items-center text-yellow-500">
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Transaction is confirming...
                          </span>
                      )}
                      {isConfirmed && (
                          <span className="flex items-center text-green-500">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Transaction confirmed! Saving to backend...
                          </span>
                      )}
                      {!isConfirming && !isConfirmed && (
                          <span className="text-muted-foreground">
                              Transaction sent, waiting for confirmation...
                          </span>
                      )}
                  </div>
                )}

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}