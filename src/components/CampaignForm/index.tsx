'use client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { Fragment, useState, useEffect } from 'react'
import { Campaign as CampaignType } from '@/types'
import { MiniKit } from '@worldcoin/minikit-js'
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'
import WRABI from '@/abi/WRCredit.json'
import { useSession } from 'next-auth/react'
import { createPublicClient, http } from 'viem'
import { worldchain } from 'viem/chains'
import { parseUnits } from "ethers"
import { toast } from "sonner"


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
      toast.error('Failed to publish campaign.')
    } else {
      toast.success('Campaign published successfully!')
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
    onSubmit(data.record) // data.record = campaign baru dari backend
  }

      setTimeout(() => {
        setPublishing(false)
        onClose()
      }, 1000)
    }
  } catch (err) {
    console.error('publish error', err)
    toast.error('Failed to publish campaign. Please try again.')
  } finally {
    setPublishing(false)
  }
}
    saveCampaign()
  }, [isConfirmed, transactionId]) 
   

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
      toast.error('Title is required')
      return
    }
    if (!campaign.description.trim()) {
      toast.error('Description is required')
      return
    }
  
  if (!campaign.tasks || campaign.tasks.length === 0) {
    toast.error('At least one task is required')
    return
  }

  for (const [index, t] of campaign.tasks.entries()) {
    if (!t.service || !t.type || !t.url) {
      toast.error(`Task #${index + 1} is incomplete`)
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
    toast.error(`⚠️ Invalid Twitter profile URL for task "${t.type}": ${String(err)}`)
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
    toast.error(`⚠️ Invalid Twitter/X URL for task "${t.type}" — ${String(err)}`)
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
            toast.error(
              '⚠️ Please make sure you have added our bot @WR_PlatformBot to your group/channel before publishing this campaign.'
            )
            setPublishing(false)
            return
          }
        } catch (err) {
          console.error('verifyTelegram error:', err)
          toast.error('Failed to verify Telegram group/channel. Please try again.')
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
            toast.error(
              '⚠️ Please invite the WR Platform Bot to your Discord server (use "Add WR Platform Bot to Server" button) and try again.'
            )
            setPublishing(false)
            return
          }
        } catch (err) {
          console.error('verifyDiscord error:', err)
          toast.error('Failed to verify Discord server. Please try again.')
          setPublishing(false)
          return
        }
      }
    }
    

    const rewardPerTask = parseFloat(campaign.reward || '0')
    const totalBudget = parseFloat(campaign.budget || '0')

    if (rewardPerTask < 10) {
      toast.error('Reward per task cannot be less than 10')
      setPublishing(false)
      return
    }

    if (rewardPerTask > totalBudget) {
      toast.error('Reward cannot be greater than total budget')
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

  if (!res.ok) {
    return
  }

    if (onSubmit) {
    await onSubmit(data)
  }

} catch (err) {
  console.error('Failed to save campaign', err)

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
      toast.error('Transaction failed. Please try again.')
      return null
    }

    console.log('✅ WR transferred successfully:', finalPayload.transaction_id)
    return finalPayload.transaction_id
  } catch (err) {
    console.error('Error sending WR:', err)
    toast.error('Failed to send WR transaction.')
    return null
  }
}

return (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900 text-white">
      <DialogHeader>
        <DialogTitle className="text-xl">
          {editingCampaign ? "Edit Campaign" : "Create New Campaign"}
        </DialogTitle>
      </DialogHeader>

      {/* Main scroll area */}
      <div className="space-y-4">

        {/* Title */}
        <Input
          placeholder="Campaign Title"
          value={campaign.title}
          onChange={(e) => handleChange("title", e.target.value)}
        />

        {/* Description */}
        <Textarea
          rows={3}
          placeholder="Description"
          value={campaign.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />

        {/* Budget */}
        <Input
          type="number"
          min={0}
          placeholder="Total Budget (e.g. 1000 WR)"
          value={campaign.budget || ""}
          onChange={(e) => handleChange("budget", e.target.value)}
          disabled={isEditing}
        />

        {/* Reward */}
        <Input
          type="number"
          min={0}
          placeholder="Reward per Task (e.g. 10 WR)"
          value={campaign.reward || ""}
          onChange={(e) => handleChange("reward", e.target.value)}
          disabled={isEditing}
        />

        {/* TASKS */}
        <div className="space-y-3">
          {(campaign.tasks || []).map((task, i) => {
            let urlPlaceholder = "Paste target URL (e.g. profile link)";
            if (task.service === "twitter") {
              if (task.type === "follow") urlPlaceholder = "Paste profile URL (e.g. https://twitter.com/username)";
              else if (task.type === "like" || task.type === "retweet")
                urlPlaceholder = "Paste tweet URL (e.g. https://twitter.com/user/status/123)";
            } else if (task.service === "telegram") {
              if (task.type === "join_group") urlPlaceholder = "Paste Telegram group URL (e.g. https://t.me/group)";
              else if (task.type === "join_channel") urlPlaceholder = "Paste Telegram channel URL (e.g. https://t.me/channel)";
            } else if (task.service === "discord") {
              if (task.type === "join") urlPlaceholder = "Paste Discord server invite URL (e.g. https://discord.gg/xxxx)";
            }

            return (
              <div key={i} className="bg-gray-800 p-3 rounded-xl space-y-3">
                
                {/* SERVICE SELECT */}
                <Select
                  value={task.service}
                  onValueChange={(val) => updateTask(i, "service", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Service" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_OPTIONS.map((s) => (
                      <SelectItem key={s.service} value={s.service}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* TYPE SELECT */}
                {task.service && (
                  <Select
                    value={task.type}
                    onValueChange={(val) => updateTask(i, "type", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Task Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPE_OPTIONS[task.service].map((t) => (
                        <SelectItem key={t.value} value={t.value} disabled={t.disabled}>
                          {t.label} {t.disabled ? "(Coming Soon)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* URL INPUT */}
                <Input
                  placeholder={urlPlaceholder}
                  value={task.url}
                  onChange={(e) => updateTask(i, "url", e.target.value)}
                  readOnly={task.isOld}
                  className={task.isOld ? "opacity-60 cursor-not-allowed" : ""}
                />

                {/* Telegram Warning */}
                {task.service === "telegram" &&
                  (task.type === "join_group" || task.type === "join_channel") && (
                    <p className="text-yellow-400 text-sm">
                      ⚠️ Add bot <b>@WR_PlatformBot</b> to your group/channel before publishing.
                    </p>
                )}

                {/* Discord Warning + Verify */}
                {task.service === "discord" && task.type === "join" && (
                  <>
                    <p className="text-yellow-400 text-sm">
                      ⚠️ Invite WR Platform Bot to your Discord server before publishing.
                    </p>

                    <div className="flex gap-2">
                      <Button asChild>
                        <a
                          href={DISCORD_INVITE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Add Bot to Server
                        </a>
                      </Button>

                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={async () => {
                          try {
                            setPublishing(true)
                            const res = await fetch("/api/connect/discord/verifyServer", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ url: task.url }),
                            })
                            const data = await res.json()
                            if (!res.ok || !data.valid) {
                              toast.error("⚠️ Bot not found in server.")
                            } else {
                              toast.success("Bot verified successfully.")
                            }
                          } catch {
                            toast.error("Failed to verify server.")
                          } finally {
                            setPublishing(false)
                          }
                        }}
                      >
                        Verify Bot
                      </Button>
                    </div>
                  </>
                )}

                {/* REMOVE TASK */}
                <Button
                  variant="destructive"
                  onClick={() => removeTask(i)}
                  className="w-full"
                >
                  Remove Task
                </Button>
              </div>
            )
          })}

          {/* ADD TASK BUTTON */}
          {campaign.tasks.length < MAX_TASKS && (
            <Button
              className="w-full"
              onClick={() =>
                handleChange("tasks", [
                  ...campaign.tasks,
                  { service: "", type: "", url: "", isOld: false },
                ])
              }
            >
              + Add Task
            </Button>
          )}
        </div>
      </div>

      {/* FOOTER BUTTONS */}
      <DialogFooter className="mt-6 flex gap-2">
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={publishing}
        >
          {publishing ? "Publishing..." : editingCampaign ? "Update Campaign" : "Publish"}
        </Button>

        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            setEditingCampaign(null)
            onClose()
          }}
        >
          Cancel
        </Button>
      </DialogFooter>

    </DialogContent>
  </Dialog>
);
}
