'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { MiniKit, MiniAppSendTransactionSuccessPayload } from '@worldcoin/minikit-js'
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'
import abi from '@/abi/WRCredit.json'
import Toast from '@/components/Toast'
import { createPublicClient, http } from 'viem'
import { worldchain } from 'viem/chains'

export default function TopupWR() {
  const { data: session } = useSession()
  const [amountUSDC, setAmountUSDC] = useState('')
  const [estimatedWR, setEstimatedWR] = useState('0.0000')
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [transactionId, setTransactionId] = useState<string>('')

  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WR_CONTRACT || ''
  const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_CONTRACT || ''
  const RATE = 0.0050

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

  useEffect(() => {
    if (!amountUSDC) return setEstimatedWR('0.0000')
    setEstimatedWR((parseFloat(amountUSDC) * RATE).toFixed(4))
  }, [amountUSDC])

  const handleTopup = async () => {
    if (!amountUSDC || !userAddress) {
      setToast({ message: 'Enter USDC amount and connect your wallet.', type: 'error' })
      return
    }

    try {
      setLoading(true)
      const usdcAmount = (Number(amountUSDC) * 1_000_000).toString()

      const txResult = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: CONTRACT_ADDRESS,
            abi,
            functionName: 'topupWithUSDCWithPermit2',
            args: [
              userAddress,
              usdcAmount,
              'PERMIT2_SIGNATURE_PLACEHOLDER_0',
            ],
          },
        ],
        permit2: [
          {
            permitted: { token: USDC_ADDRESS, amount: usdcAmount },
            spender: CONTRACT_ADDRESS,
            nonce: Date.now().toString(),
            deadline: Math.floor((Date.now() + 1000 * 60 * 10) / 1000).toString(),
          },
        ],
      })

      // Ambil transaction_id dari finalPayload jika success
      const successPayload = txResult.finalPayload as MiniAppSendTransactionSuccessPayload
      if (successPayload?.transaction_id) {
        setTransactionId(successPayload.transaction_id)
        setToast({ message: `Transaction sent! ID: ${successPayload.transaction_id}`, type: 'success' })
      } else {
        setToast({ message: 'Transaction sent but could not get transaction_id', type: 'success' })
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
        <h1 className="text-white text-2xl font-bold text-center mb-6">Topup WR with USDC</h1>

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
          onClick={handleTopup}
          disabled={loading}
          className={`w-full py-3 rounded-xl font-semibold text-white ${
            loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Processing...' : 'Confirm Topup'}
        </button>

        {transactionId && (
          <div className="mt-4 text-center text-gray-300 text-sm">
            {isConfirming && <span>Transaction is confirming...</span>}
            {isConfirmed && <span className="text-green-400">Transaction confirmed!</span>}
            {!isConfirming && !isConfirmed && <span>Transaction sent, waiting for confirmation...</span>}
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
