'use client'

import { useState, useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'
import ERC20 from '@/abi/ERC20.json'
import { createPublicClient, http } from 'viem'
import { worldchain } from 'viem/chains'
import { useSession } from 'next-auth/react'
import Toast from '@/components/Toast'

interface USDCTransferModalProps {
  onClose: () => void
}

const USDCTransferModal = ({ onClose }: USDCTransferModalProps) => {
  const [amountUSDC, setAmountUSDC] = useState('')
  const [estimatedWR, setEstimatedWR] = useState('0.0000')
  const [transactionId, setTransactionId] = useState<string>('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const RATE = 0.0050 // 1 WR = 0.0050 USDC

  const { data: session } = useSession()
  const userAddress = session?.user?.walletAddress || ''

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

  useEffect(() => {
    if (!isConfirmed || !transactionId) return
    if (!userAddress) return

    const sendToBackend = async () => {
      try {
        const res = await fetch('/api/topup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            depositTxHash: transactionId,
            userAddress,
            amountUSDC,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          console.error('❌ Topup backend error:', data)
        } else {
          setToast({
            message: `Topup successful, ${estimatedWR} WR added. Please refresh dashboard.`,
            type: 'success',
          })
        }
      } catch (err) {
        console.error('Failed to call topup API:', err)
      }
    }
    sendToBackend()
  }, [isConfirmed, transactionId])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}
    >
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div
        style={{
          backgroundColor: '#1f2937',
          padding: '24px',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '400px',
          position: 'relative',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            color: '#d1d5db',
            fontWeight: 'bold',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          ✕
        </button>

        <h2 style={{ color: 'white', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
          Topup WR with USDC
        </h2>

        <label style={{ color: '#d1d5db', fontSize: '14px' }}>USDC Amount</label>
        <input
          type="number"
          value={amountUSDC}
          onChange={(e) => setAmountUSDC(e.target.value)}
          placeholder="0.0"
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '4px',
            marginBottom: '16px',
            borderRadius: '16px',
            backgroundColor: '#111827',
            color: 'white',
            border: '1px solid #374151',
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '14px', marginBottom: '24px' }}>
          <span>WR you will receive:</span>
          <span style={{ color: 'white' }}>{estimatedWR} WR</span>
        </div>

        <button
          onClick={sendTransaction}
          disabled={isConfirming}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '16px',
            fontWeight: 600,
            color: 'white',
            backgroundColor: isConfirming ? '#4b5563' : '#2563eb',
            cursor: isConfirming ? 'not-allowed' : 'pointer',
            border: 'none',
          }}
        >
          {isConfirming ? 'Waiting for confirmation...' : 'Send USDC'}
        </button>

        {transactionId && (
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px', color: '#d1d5db' }}>
            {isConfirming && <span>Transaction is confirming...</span>}
            {isConfirmed && <span style={{ color: '#22c55e' }}>Transaction confirmed ✅</span>}
            {!isConfirming && !isConfirmed && <span>Transaction sent, waiting for confirmation...</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default USDCTransferModal
