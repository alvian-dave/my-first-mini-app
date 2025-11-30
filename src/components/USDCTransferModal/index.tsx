'use client'

import { useState, useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'
import { createPublicClient, http } from 'viem'
import { worldchain } from 'viem/chains'
import { useSession } from 'next-auth/react'
import { Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner' 

// ABI (Asumsi file ini ada di path yang benar)
import ERC20 from '@/abi/ERC20.json' 

// Komponen Shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface USDCTransferModalProps {
  onClose: () => void
}

const USDCTransferModal = ({ onClose }: USDCTransferModalProps) => {
  const [amountUSDC, setAmountUSDC] = useState('')
  const [estimatedWR, setEstimatedWR] = useState('0.0000')
  const [transactionId, setTransactionId] = useState<string>('')
  
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

  // Fungsi Sonner Toast - Disesuaikan untuk tema gelap
  const showSonnerToast = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      toast.success(message, {
        duration: 3000,
        style: { backgroundColor: '#1f2937', color: 'white', borderColor: '#34d399' }
      })
    } else {
      toast.error(message, {
        duration: 3000,
        style: { backgroundColor: '#450a0a', color: 'white', borderColor: '#f87171' }
      })
    }
  }

  // Effect untuk menghitung estimasi WR
  useEffect(() => {
    if (!amountUSDC || isNaN(parseFloat(amountUSDC))) return setEstimatedWR('0.0000')
    const wr = parseFloat(amountUSDC) / RATE
    setEstimatedWR(wr.toFixed(4))
  }, [amountUSDC])

  // Fungsi Pengiriman Transaksi
  const sendTransaction = async () => {
    if (!amountUSDC || Number(amountUSDC) <= 0) {
        showSonnerToast('Please enter a valid amount.', 'error')
        return
    }

    const usdcAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT || ''
    const contractAddress = process.env.NEXT_PUBLIC_WR_CONTRACT || ''
    // Pastikan amount dihitung dengan benar. USDC menggunakan 6 desimal
    const amount = (Number(amountUSDC) * 1_000_000).toString() 

    try {
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
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
        
        let errorMessage = 'Unknown error';
        
        if ((finalPayload as any).error) {
            errorMessage = (finalPayload as any).error;
        } else {
            errorMessage = JSON.stringify(finalPayload);
        }
        
        showSonnerToast(`Transaction failed: ${errorMessage}`, 'error')
        
      } else {
        console.log('Transaction sent successfully:', finalPayload)
        setTransactionId(finalPayload.transaction_id)
        showSonnerToast('Transaction sent! Waiting for network confirmation.', 'success')
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      showSonnerToast(`Unexpected error during transaction: ${err instanceof Error ? err.message : String(err)}`, 'error')
    }
  }

  // Effect Pasca Konfirmasi Transaksi (Kirim ke Backend)
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
          showSonnerToast(data.message || 'Topup processing failed on backend.', 'error')
        } else {
          showSonnerToast(
            `Topup successful, ${estimatedWR} WR added. Please refresh dashboard.`,
            'success'
          )
          // Opsional: Tutup modal setelah proses backend berhasil
          // onClose() 
        }
      } catch (err) {
        console.error('Failed to call topup API:', err)
        showSonnerToast('Failed to connect to backend service.', 'error')
      }
    }
    sendToBackend()
  }, [isConfirmed, transactionId, userAddress, amountUSDC, estimatedWR])

  return (
    // Menggunakan Dialog shadcn/ui
    <Dialog open={true} onOpenChange={onClose}>
<DialogContent
  // Dark Mode: Latar belakang gelap (bg-gray-900), border abu-abu
  // PERBAIKAN: Menambahkan text-gray-400 untuk membuat tombol close (X) terlihat
  className="sm:max-w-[425px] rounded-xl border border-gray-700 bg-gray-900 p-6 
             text-gray-400 hover:text-white 
             focus-visible:ring-blue-600 focus-visible:ring-offset-gray-900"
>
  <DialogHeader className="text-center">
          <DialogTitle 
            // Teks putih untuk judul
            className="text-2xl font-bold text-white"
          >
            Topup WR with USDC 💵
          </DialogTitle>
          <DialogDescription 
            // Teks abu-abu terang untuk deskripsi
            className="text-sm text-gray-400"
          >
            Transfer USDC on World Chain to receive WR at a rate of 1 WR = ${RATE} USDC.
          </DialogDescription>
        </DialogHeader>

        {/* Input Form */}
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="usdc-amount" 
                // Teks abu-abu terang untuk label
                className="text-sm text-gray-400"
            >
              USDC Amount
            </Label>
            <div className="relative mt-2">
              <Input
                id="usdc-amount"
                type="number"
                value={amountUSDC}
                onChange={(e) => setAmountUSDC(e.target.value)}
                placeholder="0.00"
                // Dark Mode Input: bg-gray-800, border-gray-700, teks putih
                // Ring Focus: Menggunakan ring-blue-600 sesuai permintaan, ring-offset-gray-900 untuk dark mode
                className="pr-16 h-12 text-lg bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-blue-600 focus-visible:ring-offset-gray-900"
              />
              <span 
                // Teks abu-abu gelap untuk placeholder/suffix
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500"
              >
                USDC
              </span>
            </div>
          </div>

          <div className="flex justify-between text-sm pt-2">
            <span className="text-gray-400">WR you will receive:</span>
            <span className="font-semibold text-white">
              {estimatedWR} WR
            </span>
          </div>
        </div>
        
        {/* Tombol Aksi - Diubah menjadi blue-600 */}
        <Button
          onClick={sendTransaction}
          disabled={isConfirming || Number(amountUSDC) <= 0 || !userAddress}
          // Tombol utama: bg-blue-600, hover:bg-blue-700
          className="w-full h-12 text-base font-semibold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isConfirming ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Waiting for confirmation...
            </>
          ) : (
            'Send USDC'
          )}
        </Button>

        {/* Status Transaksi - Disesuaikan untuk dark mode (warna 400 scale) */}
        {transactionId && (
          <div className="mt-4 flex items-center justify-center text-sm font-medium">
            {isConfirming && (
              <span className="flex items-center text-yellow-400">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Transaction is confirming...
              </span>
            )}
            {isConfirmed && (
              <span className="flex items-center text-green-400">
                <CheckCircle className="w-4 h-4 mr-2" />
                Transaction confirmed!
              </span>
            )}
            {!isConfirming && !isConfirmed && (
                <span className="text-gray-500">
                    Transaction sent, waiting for confirmation...
                </span>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default USDCTransferModal