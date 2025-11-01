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
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex justify-center w-full px-4">
    <div
      className={`inline-block max-w-md px-6 py-3 rounded-lg shadow-lg text-white text-center whitespace-nowrap ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {message}
    </div>
  </div>
)
}
