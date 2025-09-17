'use client'

import { useState } from 'react'
import Toast from './Toast'

interface TopupModalProps {
  userId: string
  onClose: () => void
  onSuccess: (newBalance: number) => void
}

export default function TopupModal({ userId, onClose, onSuccess }: TopupModalProps) {
  const [amount, setAmount] = useState("")
  const [password, setPassword] = useState("")
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const handleSubmit = async () => {
    const amountNumber = parseInt(amount, 10)

    if (isNaN(amountNumber) || amountNumber <= 0) {
      setToastType('error')
      setToastMessage("Invalid amount")
      return
    }

    try {
      const res = await fetch(`/api/balance/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNumber, password }),
      })
      const data = await res.json()
      if (data.success) {
        onSuccess(data.balance.amount)
        setAmount("")
        setPassword("")
        onClose()

        setToastType('success')
        setToastMessage("Topup successful!")
      } else {
        setToastType('error')
        setToastMessage(data.error || "Topup failed")
      }
    } catch (err) {
      console.error("Topup error:", err)
      setToastType('error')
      setToastMessage("Unexpected error occurred")
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-80">
          <h2 className="text-lg font-bold mb-4">Topup Balance</h2>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full mb-3 p-2 rounded text-black"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full mb-3 p-2 rounded text-black"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 rounded bg-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-3 py-1 rounded bg-green-600"
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  )
}
