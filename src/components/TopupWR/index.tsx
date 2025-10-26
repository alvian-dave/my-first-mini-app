'use client'

import { useState, useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'
import abi from '@/abi/WRCredit.json'
import { createPublicClient, http } from 'viem'
import { worldchain } from 'viem/chains'
import Toast from '@/components/Toast'
import { useSession } from 'next-auth/react'

interface TopupWRProps {
  onClose: () => void
}

export default function TopupWR({ onClose }: TopupWRProps) {
  const { data: session } = useSession()
  const [amountUSDC, setAmountUSDC] = useState('')
  const [estimatedWR, setEstimatedWR] = useState('0.0000')
  const [userAddress, setUserAddress] = useState<string>('')
  const [transactionId, setTransactionId] = useState<string>('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WR_CONTRACT || ''
  const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_CONTRACT || ''
  const RATE = 0.0050 // 1 WR = 0.0050 USDC

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
    if (session?.user?.walletAddress) setUserAddress(session.user.walletAddress)
  }, [session])

  // Hitung WR otomatis
  useEffect(() => {
    if (!amountUSDC) return setEstimatedWR('0.0000')
    const wr = parseFloat(amountUSDC) / RATE
    setEstimatedWR(wr.toFixed(4))
  }, [amountUSDC])

  const sendTransaction = async () => {
    if (!amountUSDC || Number(amountUSDC) <= 0) {
      setToast({ message: 'Enter a valid USDC amount.', type: 'error' })
      return
    }

    const usdcAmount = (Number(amountUSDC) * 1_000_000).toString() // USDC 6 decimals

    // Generate permit fresh saat klik tombol
    const nonce = Date.now().toString()
    const deadline = Math.floor((Date.now() + 60 * 60 * 1000) / 1000).toString() // 1 jam dari sekarang

    const permitArg = {
      permitted: { token: USDC_ADDRESS, amount: usdcAmount },
      spender: userAddress,
      nonce,
      deadline,
    }

    try {
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: CONTRACT_ADDRESS,
            abi,
            functionName: 'topupWithUSDCWithPermit2',
            args: [
              [
                permitArg.permitted.token,
                permitArg.permitted.amount,
                permitArg.nonce,
                permitArg.deadline,
                ],
                'PERMIT2_SIGNATURE_PLACEHOLDER',
            ],
          },
        ],
        permit2: [permitArg],
      })

      if (finalPayload.status === 'error') {
        console.error('Error sending transaction:', finalPayload)
        setToast({ message: 'Error sending transaction.', type: 'error' })
      } else {
        console.log('Transaction sent successfully:', finalPayload)
        setTransactionId(finalPayload.transaction_id)
        setToast({ message: 'Transaction sent successfully!', type: 'success' })
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setToast({ message: 'Unexpected error occurred.', type: 'error' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 p-6 rounded-2xl shadow-lg w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white font-bold"
        >
          ✕
        </button>

        <h2 className="text-white text-2xl font-bold mb-4 text-center">Topup WR with USDC</h2>

        <label className="text-gray-400 text-sm">USDC Amount</label>
        <input
          type="number"
          value={amountUSDC}
          onChange={(e) => setAmountUSDC(e.target.value)}
          placeholder="0.0"
          className="w-full p-3 mt-1 mb-4 rounded-xl bg-gray-800 text-white focus:outline-none"
        />

        <div className="flex justify-between text-gray-300 text-sm mb-6">
          <span>WR you will receive:</span>
          <span className="text-white">{estimatedWR} WR</span>
        </div>

        <button
          onClick={sendTransaction}
          disabled={isConfirming}
          className={`w-full py-3 rounded-xl font-semibold text-white ${
            isConfirming ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isConfirming ? 'Waiting for confirmation...' : 'Confirm Topup'}
        </button>

        {transactionId && (
          <div className="mt-4 text-center text-gray-300 text-sm">
            {isConfirming && <span>Transaction is confirming...</span>}
            {isConfirmed && <span className="text-green-400">Transaction confirmed ✅</span>}
            {!isConfirming && !isConfirmed && <span>Transaction sent, waiting for confirmation...</span>}
          </div>
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  )
}
