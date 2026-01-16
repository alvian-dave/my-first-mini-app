'use client'

import { useState, useEffect, useRef } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'
import { createPublicClient, http } from 'viem'
import { worldchain } from 'viem/chains'
import { useSession } from 'next-auth/react'
import { parseUnits } from "ethers"
import { Loader2, Megaphone, Globe, Clock, Upload, X, CheckCircle2, AlertCircle, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'

import ERC20ABI from '@/abi/ERC20.json'
import WRABI from '@/abi/WRCredit.json'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AdPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
}

const AdPurchaseModal = ({ isOpen, onClose }: AdPurchaseModalProps) => {
  const [targetUrl, setTargetUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [transactionId, setTransactionId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'WR' | 'USDC'>('WR')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Slot States
  const [adStatus, setAdStatus] = useState<{ live: boolean; queued: boolean; canBook: boolean }>({
    live: false,
    queued: false,
    canBook: true
  })
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()
  const userAddress = session?.user?.walletAddress || ''

  const PRICES = { WR: "200", USDC: "1" }

  const client = createPublicClient({
    chain: worldchain,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL),
  })

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    client,
    appConfig: { app_id: process.env.NEXT_PUBLIC_APP_ID || '' },
    transactionId,
  })

  // 1. Fetch Slot Availability
  const fetchStatus = async () => {
    try {
      setIsLoadingStatus(true)
      const res = await fetch('/api/ads')
      if (res.ok) {
        const data = await res.json()
        // Anggap data.ad adalah yang LIVE, data.canBook adalah ketersediaan QUEUE
        setAdStatus({
          live: !!data.ad,
          queued: !data.canBook,
          canBook: data.canBook
        })
      }
    } catch (err) {
      console.error("Status fetch error")
    } finally {
      setIsLoadingStatus(false)
    }
  }

  useEffect(() => {
    if (isOpen) fetchStatus()
  }, [isOpen])

  const showToast = (message: string, type: 'success' | 'error') => {
    toast[type](message, {
      duration: 4000,
      style: { backgroundColor: '#0f172a', color: type === 'success' ? '#10b981' : '#ef4444', borderColor: 'rgba(255,255,255,0.1)' }
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return showToast('File too large (Max 2MB)', 'error')

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        setImageUrl(data.url)
        showToast('Banner uploaded', 'success')
      }
    } catch (err) {
      showToast('Upload failed', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleExecutePayment = async () => {
    if (!adStatus.canBook) return showToast('Slot is already full', 'error')
    if (!targetUrl || !imageUrl) return showToast('Complete all steps', 'error')
    
    setIsSubmitting(true)
    try {
      const isWR = paymentMethod === 'WR'
      const contractTarget = isWR ? process.env.NEXT_PUBLIC_WR_ESCROW : process.env.NEXT_PUBLIC_WR_CONTRACT
      const tokenAddress = isWR ? process.env.NEXT_PUBLIC_WR_CONTRACT : process.env.NEXT_PUBLIC_USDC_CONTRACT
      const abi = isWR ? WRABI : ERC20ABI
      const decimals = isWR ? 18 : 6
      const amount = parseUnits(PRICES[paymentMethod], decimals).toString()

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: tokenAddress!,
          abi: abi,
          functionName: 'transfer',
          args: [contractTarget!, amount],
        }],
      })

      if (finalPayload.status === 'error') {
        showToast('Transaction cancelled', 'error')
        setIsSubmitting(false)
      } else {
        setTransactionId(finalPayload.transaction_id)
      }
    } catch (err) {
      showToast('Execution error', 'error')
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!isConfirmed || !transactionId || !userAddress) return
    const saveAd = async () => {
      try {
        const res = await fetch('/api/ads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transactionId, 
            userAddress, 
            targetUrl, 
            imageUrl, 
            paymentMethod, 
            amount: PRICES[paymentMethod],
            isQueued: adStatus.live // Jika sudah ada yang LIVE, maka simpan sebagai QUEUE
          }),
        })
        if (res.ok) {
          showToast(adStatus.live ? 'Booked for tomorrow!' : 'Ad is now LIVE!', 'success')
          setTimeout(() => { onClose(); window.location.reload() }, 1500)
        }
      } catch (err) {
        showToast('Sync failed', 'error')
      } finally {
        setIsSubmitting(false)
      }
    }
    saveAd()
  }, [isConfirmed])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95%] sm:max-w-[440px] rounded-[32px] border border-white/10 bg-[#020617]/95 backdrop-blur-3xl p-0 overflow-hidden shadow-2xl z-[100]">
        
        {/* TOP STATUS BAR */}
        <div className={`py-2 px-6 flex items-center justify-between border-b border-white/5 ${adStatus.canBook ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${adStatus.canBook ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${adStatus.canBook ? 'text-emerald-400' : 'text-red-400'}`}>
              {adStatus.canBook ? 'Available Slot' : 'All Slots Booked'}
            </span>
          </div>
          {adStatus.live && adStatus.canBook && (
            <span className="text-[9px] font-bold text-blue-400 uppercase italic">Next: Available in queue</span>
          )}
        </div>

        <div className="p-6 space-y-6 relative">
          
          {/* FULLY BOOKED OVERLAY */}
          {!adStatus.canBook && !isLoadingStatus && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-[#020617]/40 backdrop-blur-[2px] text-center">
              <div className="p-4 rounded-3xl bg-red-500/10 border border-red-500/20 mb-4 transform scale-110">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Reservations Full</h3>
              <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">
                Both daily and queue slots are currently occupied.<br/>Please check back after 24 hours.
              </p>
            </div>
          )}

          {/* Header */}
          <div className={`flex items-center gap-3 transition-all duration-500 ${!adStatus.canBook ? 'opacity-20 grayscale' : 'opacity-100'}`}>
            <div className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
              <Megaphone size={22} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/80 italic">Global Feed Placement</h2>
              <DialogTitle className="text-2xl font-black text-white italic uppercase tracking-tighter">
                Advertise <span className="text-emerald-400">Now</span>
              </DialogTitle>
            </div>
          </div>

          <div className={`space-y-5 transition-all duration-500 ${!adStatus.canBook ? 'opacity-20 blur-sm' : 'opacity-100'}`}>
            {/* Step 1: Upload */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-[11px] font-black uppercase text-slate-400 ml-1">1. Visual Content</Label>
                {imageUrl && <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Ready</span>}
              </div>
              
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
              
              {!imageUrl ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !adStatus.canBook}
                  className="w-full aspect-[4/1.2] rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:border-emerald-500/40 transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-400" /> : (
                    <>
                      <Upload size={20} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Banner 2:1 (800x400) max 2MB</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-[4/1.2] group">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                    <Button variant="destructive" size="sm" className="rounded-full font-black text-[10px]" onClick={() => setImageUrl('')}>
                      <X size={14} className="mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: URL */}
            <div className="space-y-3">
            <Label className="text-[11px] font-black uppercase text-slate-400 ml-1">2. Link / Url</Label>
            <div className="relative group">
                <Input 
                placeholder="https://..." 
                value={targetUrl} 
                onChange={(e) => setTargetUrl(e.target.value)}
                disabled={!adStatus.canBook}
                // UBAH: text-sm menjadi text-white font-bold
                className="h-12 bg-white/5 border-white/10 rounded-2xl pl-11 focus:ring-emerald-500/50 text-white font-bold placeholder:text-slate-500 transition-colors"
                />
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400" size={18} />
            </div>
            </div>

                {/* Step 3: Payment */}
                <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase text-slate-400 ml-1">3. Payment</Label>
                <Tabs defaultValue="WR" onValueChange={(v) => setPaymentMethod(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1.5 rounded-[20px] border border-white/5 h-14">
                    <TabsTrigger 
                        value="WR" 
                        // UBAH: Tambahkan text-slate-200 agar cerah saat tidak aktif
                        className="rounded-xl font-black text-[11px] uppercase tracking-wider transition-all
                                data-[state=active]:bg-emerald-500 data-[state=active]:text-white
                                data-[state=inactive]:text-slate-200 data-[state=inactive]:hover:text-white"
                    >
                        200 WR
                    </TabsTrigger>
                    <TabsTrigger 
                        value="USDC" 
                        // UBAH: Sama dengan di atas
                        className="rounded-xl font-black text-[11px] uppercase tracking-wider transition-all
                                data-[state=active]:bg-blue-600 data-[state=active]:text-white
                                data-[state=inactive]:text-slate-200 data-[state=inactive]:hover:text-white"
                    >
                        1 USDC.e
                    </TabsTrigger>
                    </TabsList>
                </Tabs>
                </div>

            {/* Ad Type Info */}
            <div className={`p-4 rounded-2xl flex items-center justify-between border ${adStatus.live ? 'bg-blue-500/5 border-blue-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
               <div className="flex items-center gap-3">
                 {adStatus.live ? <CalendarClock size={20} className="text-blue-400" /> : <Clock size={20} className="text-emerald-400" />}
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-500 uppercase">Scheduling Status</span>
                    <span className="text-[11px] font-black text-white italic uppercase">
                      {adStatus.live ? 'QUEUED FOR TOMORROW' : 'LIVE IMMEDIATELY'}
                    </span>
                 </div>
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-black text-white italic">{PRICES[paymentMethod]} {paymentMethod}</span>
                  <span className="text-[7px] block font-bold text-slate-500 uppercase">Per 24 Hours</span>
               </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleExecutePayment}
              disabled={!adStatus.canBook || isConfirming || isSubmitting || isUploading || !targetUrl || !imageUrl}
              className={`w-full h-16 font-black uppercase tracking-[0.2em] rounded-[24px] text-sm shadow-xl transition-all active:scale-[0.98] ${
                !adStatus.canBook ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
                paymentMethod === 'WR' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {isLoadingStatus ? <Loader2 className="animate-spin" /> : 
               !adStatus.canBook ? 'All Slots Occupied' : 
               isConfirming || isSubmitting ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Finalizing...</span> : 
               `Launch Placement`}
            </Button>
            
            {!adStatus.canBook && (
              <p className="text-[9px] text-center font-bold text-red-500/60 uppercase tracking-widest">
                You must return after current ads expire
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AdPurchaseModal