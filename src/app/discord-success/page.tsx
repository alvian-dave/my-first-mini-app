'use client'

import { useEffect } from 'react'

export default function DiscordSuccessPage() {
  useEffect(() => {
    // kirim sinyal balik ke window yang membuka popup (parent window)
    if (window.opener) {
      window.opener.postMessage(
        { type: 'DISCORD_CONNECTED', success: true },
        window.location.origin
      )
      window.close()
    } else {
      // fallback kalau user langsung buka page ini (bukan dari popup)
      window.location.href = '/dashboard/hunter'
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-xl font-bold mb-4">Discord Connected ✅</h1>
        <p>You can close this window.</p>
      </div>
    </div>
  )
}
