import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { Campaign } from "@/models/Campaign"
import SocialAccount from "@/models/SocialAccount"
import { resolveTelegramChatId } from "@/lib/telegram"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

export async function POST(req: Request) {
  await dbConnect()

  const { userId, campaignId, taskIndex } = await req.json()
  // taskIndex = urutan task Telegram dalam campaign.tasks[n]

  // 1️⃣ Ambil campaign dan task Telegram
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) {
    return NextResponse.json({ verified: false, reason: "Campaign not found" })
  }

  const task = campaign.tasks[taskIndex]
  if (!task || task.service !== "telegram") {
    return NextResponse.json({ verified: false, reason: "Invalid task" })
  }

  // 2️⃣ Ambil akun Telegram user
  const account = await SocialAccount.findOne({ userId, provider: "telegram" })
  if (!account || !account.socialId) {
    return NextResponse.json({ verified: false, reason: "Telegram not connected" })
  }

  // 3️⃣ Resolve chat_id jika belum pernah disimpan (cache)
  let targetId = task.targetId
  if (!targetId) {
    try {
      targetId = await resolveTelegramChatId(task.url, BOT_TOKEN)
      task.targetId = targetId
      await campaign.save()
      console.log(`[Cache] Saved Telegram chat_id for ${task.url} → ${targetId}`)
    } catch (err: any) {
      console.error("Failed to resolve Telegram chat_id:", err)
      return NextResponse.json({
        verified: false,
        reason: err.message || "Failed to resolve chat id",
      })
    }
  }

  // 4️⃣ Verifikasi keanggotaan via Telegram API
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${targetId}&user_id=${account.socialId}`
    )
    const data = await res.json()
    console.log("Telegram getChatMember:", data)

    if (!data.ok) {
      return NextResponse.json({
        verified: false,
        reason: data.description || "Failed to check membership",
      })
    }

    const status = data.result.status
    const isMember = ["member", "admin", "administrator", "creator"].includes(status)

    return NextResponse.json({ verified: isMember, status })
  } catch (err: any) {
    console.error("Telegram verification error:", err)
    return NextResponse.json({
      verified: false,
      reason: err.message || "Unexpected error during verification",
    })
  }
}
