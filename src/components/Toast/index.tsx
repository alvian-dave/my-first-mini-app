'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000) // auto close 3 detik

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 center-0 z-50">
      <div
        className={`px-4 py-2 rounded shadow-md text-white ${
          type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}
      >
        {message}
      </div>
    </div>
  )
}
