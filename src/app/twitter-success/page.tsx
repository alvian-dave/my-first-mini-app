'use client'

import { useEffect } from 'react'

export default function TwitterSuccessPage() {
  useEffect(() => {
    // kirim sinyal balik ke window yang buka popup
    if (window.opener) {
      window.opener.postMessage(
        { type: 'TWITTER_CONNECTED', success: true },
        window.location.origin
      )
      window.close()
    } else {
      // fallback kalau tidak dibuka dari popup
      window.location.href = '/dashboard/hunter'
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-xl font-bold mb-4">Twitter Connected ✅</h1>
        <p>You can close this window.</p>
      </div>
    </div>
  )
}
