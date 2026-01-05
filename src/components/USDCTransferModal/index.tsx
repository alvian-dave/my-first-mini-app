'use client'

import { useState, useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'
import { createPublicClient, http } from 'viem'
import { worldchain } from 'viem/chains'
import { useSession } from 'next-auth/react'
import { Loader2, CheckCircle, Wallet, ArrowRightLeft, Zap, X } from 'lucide-react'
import { toast } from 'sonner' 

import ERC20 from '@/abi/ERC20.json' 

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
  
  const RATE = 0.0050 

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

  const showSonnerToast = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      toast.success(message, {
        duration: 3000,
        style: { backgroundColor: '#0f172a', color: '#10b981', borderColor: '#10b981/20' }
      })
    } else {
      toast.error(message, {
        duration: 3000,
        style: { backgroundColor: '#0f172a', color: '#ef4444', borderColor: '#ef4444/20' }
      })
    }
  }

  useEffect(() => {
    if (!amountUSDC || isNaN(parseFloat(amountUSDC))) return setEstimatedWR('0.0000')
    const wr = parseFloat(amountUSDC) / RATE
    setEstimatedWR(wr.toFixed(4))
  }, [amountUSDC])

  const sendTransaction = async () => {
    if (!amountUSDC || Number(amountUSDC) <= 0) {
        showSonnerToast('Please enter a valid amount.', 'error')
        return
    }

    const usdcAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT || ''
    const contractAddress = process.env.NEXT_PUBLIC_WR_CONTRACT || ''
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
        let errorMessage = (finalPayload as any).error || JSON.stringify(finalPayload);
        showSonnerToast(`Transaction failed: ${errorMessage}`, 'error')
      } else {
        setTransactionId(finalPayload.transaction_id)
        showSonnerToast('Transaction sent! Waiting for network confirmation.', 'success')
      }
    } catch (err) {
      showSonnerToast(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`, 'error')
    }
  }

  useEffect(() => {
    if (!isConfirmed || !transactionId || !userAddress) return

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
          showSonnerToast(data.message || 'Topup processing failed.', 'error')
        } else {
          showSonnerToast(`Topup successful, ${estimatedWR} WR added.`, 'success')
        }
      } catch (err) {
        showSonnerToast('Failed to connect to backend.', 'error')
      }
    }
    sendToBackend()
  }, [isConfirmed, transactionId, userAddress, amountUSDC, estimatedWR])

  return (
    <Dialog open={true} onOpenChange={onClose}>
      {/* Container utama dengan backdrop blur & penyesuaian posisi agar tidak tertutup Topbar */}
      <DialogContent className="w-[92%] sm:max-w-[400px] rounded-[32px] border border-white/10 bg-[#0f172a]/95 backdrop-blur-xl p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all">
        
        {/* Inner Glow Effect */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(59,130,246,0.05)]" />

        {/* Header Custom dengan Button Close yang jelas */}
        <div className="relative px-6 pt-8 pb-4">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
                <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <Wallet size={20} className="text-blue-400" />
                </div>
                <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Protocol: Topup</h2>
                    <DialogTitle className="text-xl font-black text-white italic uppercase tracking-tighter">
                        WR <span className="text-blue-400 italic">Credits</span>
                    </DialogTitle>
                </div>
            </div>
            <DialogDescription className="text-[11px] font-medium text-slate-400 leading-relaxed uppercase tracking-wider">
                1 WR = <span className="text-white">${RATE}</span> USDC • WORLD CHAIN
            </DialogDescription>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Input Area */}
          <div className="space-y-3">
            <div className="flex justify-between">
                <Label htmlFor="usdc-amount" className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Deposit Amount
                </Label>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">USDC.e</span>
            </div>
            
            <div className="relative group">
              <Input
                id="usdc-amount"
                type="number"
                value={amountUSDC}
                onChange={(e) => setAmountUSDC(e.target.value)}
                placeholder="0.00"
                className="h-14 text-xl font-bold bg-white/[0.03] border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 transition-all pl-12"
              />
              <ArrowRightLeft className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
            </div>
          </div>

          {/* Result Card */}
          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                    <Zap size={14} className="text-blue-400" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Received WR</span>
            </div>
            <span className="text-lg font-black text-white italic">
              {estimatedWR} <span className="text-[10px] not-italic text-blue-400 ml-1 uppercase">WR</span>
            </span>
          </div>

          {/* Action Button */}
          <div className="pb-6">
            <Button
              onClick={sendTransaction}
              disabled={isConfirming || Number(amountUSDC) <= 0 || !userAddress}
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_20px_rgba(37,99,235,0.2)] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              {isConfirming ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Syncing...</span>
                </div>
              ) : (
                'Execute Transfer'
              )}
            </Button>

            {/* Transaction Status Footer */}
            {transactionId && (
              <div className="mt-4 flex items-center justify-center p-3 rounded-xl bg-white/5 border border-white/5 animate-in fade-in slide-in-from-top-2">
                {isConfirming && (
                  <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-yellow-400">
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Pending Network Confirmation
                  </span>
                )}
                {isConfirmed && (
                  <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    <CheckCircle className="w-3 h-3 mr-2" />
                    Transaction Secured
                  </span>
                )}
                {!isConfirming && !isConfirmed && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 animate-pulse">
                        Uplinking Transaction...
                    </span>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default USDCTransferModal