'use client'

import { useState, useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'
import ERC20 from '@/abi/ERC20.json'
import { createPublicClient, http } from 'viem'
import { worldchain } from 'viem/chains'
import { useSession } from 'next-auth/react'

interface USDCTransferModalProps {
  onClose: () => void
}

const USDCTransferModal = ({ onClose }: USDCTransferModalProps) => {
  const [amountUSDC, setAmountUSDC] = useState('')
  const [estimatedWR, setEstimatedWR] = useState('0.0000')
  const [transactionId, setTransactionId] = useState<string>('')

  const RATE = 0.0050 // 1 WR = 0.0050 USDC

  // Public client untuk monitoring transaksi
  const client = createPublicClient({
    chain: worldchain,
    transport: http('https://worldchain-mainnet.g.alchemy.com/public'),
  })

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    client,
    appConfig: { app_id: process.env.NEXT_PUBLIC_APP_ID || '' },
    transactionId,
  })

  // Hitung WR otomatis
  useEffect(() => {
    if (!amountUSDC) return setEstimatedWR('0.0000')
    const wr = parseFloat(amountUSDC) / RATE
    setEstimatedWR(wr.toFixed(4))
  }, [amountUSDC])

  const sendTransaction = async () => {
    if (!amountUSDC || Number(amountUSDC) <= 0) return

    const usdcAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT || ''
    const contractAddress = process.env.NEXT_PUBLIC_WR_CONTRACT || ''
    const amount = (Number(amountUSDC) * 1_000_000).toString() // USDC 6 decimals

    try {
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: usdcAddress,
            abi: ERC20,
            functionName: 'transfer',
            args: [contractAddress, amount],
          },
        ],
      })

      if (finalPayload.status === 'error') {
        console.error('Error sending transaction:', finalPayload)
      } else {
        console.log('Transaction sent successfully:', finalPayload)
        setTransactionId(finalPayload.transaction_id)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

    // === [3] Setelah transaksi dikonfirmasi → kirim ke backend ===
  useEffect(() => {
    if (!isConfirmed || !transactionId) return

    // ✅ Ambil address user dari session (atau context kamu sendiri)
    const { data: session } = useSession()
    const userAddress = session?.user?.walletAddress || '' 
    // Ganti baris di atas dengan alamat user dari session auth kamu

    if (!userAddress) {
      console.warn('⚠️ Tidak ada userAddress di session, backend call dilewati.')
      return
    }

    const sendToBackend = async () => {
      try {
        const res = await fetch('/api/topup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            depositTxHash: transactionId,
            userAddress,
            amountUSDC, // kirim string dari input
          }),
        })
        const data = await res.json()

        if (!res.ok || !data.ok) {
          console.error('❌ Topup backend error:', data)
        } else {
          console.log('✅ Topup success & WR minted:', data)
        }
      } catch (err) {
        console.error('Failed to call topup API:', err)
      }
    }

    sendToBackend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, transactionId])

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
          {isConfirming ? 'Waiting for confirmation...' : 'Send USDC'}
        </button>

        {transactionId && (
          <div className="mt-4 text-center text-gray-300 text-sm">
            {isConfirming && <span>Transaction is confirming...</span>}
            {isConfirmed && <span className="text-green-400">Transaction confirmed ✅</span>}
            {!isConfirming && !isConfirmed && <span>Transaction sent, waiting for confirmation...</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default USDCTransferModal
