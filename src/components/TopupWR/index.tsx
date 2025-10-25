'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { MiniKit } from '@worldcoin/minikit-js'
import abi from '@/abi/WRCredit.json'
import Toast from '@/components/Toast'

export default function TopupWR() {
  const { data: session } = useSession()
  const [amountUSDC, setAmountUSDC] = useState('')
  const [estimatedWR, setEstimatedWR] = useState('0.0000')
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Alamat kontrak dari ENV
  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WRCREDIT_ADDRESS || ''
  const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '' // USDC di WorldChain

  // Rate konversi
  const RATE = 0.0050

  // Ambil alamat user dari session
  useEffect(() => {
    if (session?.user?.walletAddress) {
      setUserAddress(session.user.walletAddress)
    }
  }, [session])

  // Hitung WR otomatis
  useEffect(() => {
    if (!amountUSDC) return setEstimatedWR('0.0000')
    const wr = parseFloat(amountUSDC) * RATE
    setEstimatedWR(wr.toFixed(4))
  }, [amountUSDC])

  // Fungsi kirim transaksi
  const handleTopup = async () => {
    if (!amountUSDC || !userAddress) {
      setToast({ message: 'Enter USDC amount and connect your wallet.', type: 'error' })
      return
    }

    try {
      setLoading(true)

      const usdcAmount = (Number(amountUSDC) * 1_000_000).toString() // USDC = 6 decimals

      const { status, transaction_id } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: CONTRACT_ADDRESS,
            abi,
            functionName: 'topupWithUSDCWithPermit2',
            args: [
              userAddress,
              usdcAmount,
              'PERMIT2_SIGNATURE_PLACEHOLDER_0', // MiniKit will replace automatically
            ],
          },
        ],
        permit2: [
          {
            permitted: {
              token: USDC_ADDRESS,
              amount: usdcAmount,
            },
            spender: CONTRACT_ADDRESS,
            nonce: Date.now().toString(),
            deadline: Math.floor((Date.now() + 1000 * 60 * 10) / 1000).toString(), // 10 minutes
          },
        ],
      })

      if (status === 'pending') {
        setToast({ message: `Transaction sent! ID: ${transaction_id}`, type: 'success' })
      } else {
        setToast({ message: 'Transaction failed to send.', type: 'error' })
      }
    } catch (error: any) {
      console.error(error)
      setToast({ message: 'Failed to send transaction.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 p-6 rounded-2xl shadow-lg">
        <h1 className="text-white text-2xl font-bold text-center mb-6">
          Topup WR with USDC
        </h1>

        {/* Input USDC */}
        <label className="text-gray-400 text-sm">USDC Amount</label>
        <input
          type="number"
          value={amountUSDC}
          onChange={(e) => setAmountUSDC(e.target.value)}
          placeholder="0.0"
          className="w-full p-3 mt-1 mb-4 rounded-xl bg-gray-800 text-white focus:outline-none"
        />

        {/* Estimasi WR */}
        <div className="flex justify-between text-gray-300 text-sm mb-6">
          <span>WR you will receive:</span>
          <span className="text-white">{estimatedWR} WR</span>
        </div>

        {/* Tombol kirim */}
        <button
          onClick={handleTopup}
          disabled={loading}
          className={`w-full py-3 rounded-xl font-semibold text-white ${
            loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Processing...' : 'Confirm Topup'}
        </button>
      </div>

      {/* Toast Notifikasi */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
