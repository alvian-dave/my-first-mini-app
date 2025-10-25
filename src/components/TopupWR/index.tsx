'use client'

import { useState, useEffect } from 'react'
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from '@worldcoin/minikit-js'

interface TopupWRProps {
  isOpen: boolean
  userAddress: string
  onClose: () => void
  onSuccess: () => Promise<void>
}

export default function TopupWR({ isOpen, userAddress, onClose, onSuccess }: TopupWRProps) {
  const [usdcAmount, setUsdcAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const RATE = 0.0050
  const wrAmount = usdcAmount ? (parseFloat(usdcAmount) / RATE).toFixed(2) : '0'

  useEffect(() => {
    if (!isOpen) {
      setUsdcAmount('')
      setIsLoading(false)
    }
  }, [isOpen])

  const handleTopup = async () => {
    try {
      setIsLoading(true)

      // 1️⃣ Create reference in backend
      const res = await fetch('/api/initiate-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress }),
      })
      const { id } = await res.json()

      // 2️⃣ Prepare payload for World App
      const payload: PayCommandInput = {
        reference: id,
        to: process.env.NEXT_PUBLIC_WR_CONTRACT!,
        tokens: [
          {
            symbol: Tokens.USDC,
            token_amount: tokenToDecimals(parseFloat(usdcAmount), Tokens.USDC).toString(),
          },
        ],
        description: `Top-up ${wrAmount} WR Credit`,
      }

      // 3️⃣ Execute World App Pay Command
      if (!MiniKit.isInstalled()) {
        alert('Please open this page in World App.')
        return
      }

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload)

      // 4️⃣ Send result to backend for verification
      if (finalPayload.status === 'success') {
        const confirmRes = await fetch('/api/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: finalPayload, userAddress }),
        })
        const confirmData = await confirmRes.json()
        if (confirmData.success) {
          alert(`Top-up successful! ${wrAmount} WR will be credited shortly.`)
          await onSuccess()
          onClose()
        } else {
          alert('Payment verification failed.')
        }
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred while processing the top-up.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="bg-gray-900 border rounded-xl shadow-sm p-6 w-full max-w-md relative text-white">
    <button
      onClick={onClose}
      className="absolute right-3 top-3 text-gray-300 hover:text-white text-xl"
    >
      ×
    </button>

    <h1 className="text-2xl font-semibold text-center mb-4">Top-up WR Credit</h1>

    <label className="block text-sm font-medium mb-2">USDC Amount</label>
    <input
      type="number"
      min="0"
      step="0.01"
      value={usdcAmount}
      onChange={(e) => setUsdcAmount(e.target.value)}
      placeholder="Enter USDC Amount"
      className="w-full border border-gray-600 rounded-md p-2 mb-4 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
    />

    <p className="text-sm text-gray-300 mb-1">
      Rate: <strong>1 WR = 0.0050 USDC</strong>
    </p>
    <p className="text-sm text-gray-300 mb-4">
      WR you will receive: <strong>{wrAmount}</strong>
    </p>

    <button
      onClick={handleTopup}
      disabled={!usdcAmount || parseFloat(usdcAmount) <= 0 || isLoading}
      className={`w-full py-2 rounded-md font-medium ${
        isLoading ? 'bg-gray-600 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {isLoading ? 'Processing...' : 'Top-up'}
    </button>
  </div>
</div>
  )
}
