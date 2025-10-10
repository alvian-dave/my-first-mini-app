// /lib/telegram.ts
export async function resolveTelegramChatId(url: string, botToken: string) {
  // contoh URL: https://t.me/nama_grup
  const username = url.split("t.me/")[1].replace("/", "").trim()

  const res = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=@${username}`)
  const data = await res.json()

  if (!data.ok) {
    throw new Error(data.description || "Failed to resolve chat id")
  }

  return data.result.id // contoh: -1001234567890
}
