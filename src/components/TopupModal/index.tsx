// ✅ components/TopupModal.tsx (Ethers v6 full version)
'use client'

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import WRCreditABI from '@/abi/WRCredit.json'
import Toast from '@/components/Toast'

// ---------------- HARD-CODE : Ganti dengan yang asli ----------------
const USDC_ADDRESS = '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1'
const WLD_ADDRESS = '0x2cFc85d8E48F8EAB294be644d9E25C3030863003'
const CHAINLINK_WLD_USD_FEED = '0x4e1C6B168DCFD7758bC2Ab9d2865f1895813D236'
// --------------------------------------------------------------------

const ERC20_APPROVE_ABI = ['function approve(address spender, uint256 amount)']
const AGGREGATOR_V3_ABI = [
  'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)',
  'function decimals() view returns (uint8)',
]

type Step = 'idle' | 'approving' | 'topup' | 'success' | 'error'

interface TopupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  userAddress: string
}

export default function TopupModal({
  isOpen,
  onClose,
  onSuccess,
  userAddress,
}: TopupModalProps) {
  const [token, setToken] = useState<'WLD' | 'USDC'>('WLD')
  const [amount, setAmount] = useState<string>('')
  const [pricePerWrUsdRaw, setPricePerWrUsdRaw] = useState<bigint | null>(null)
  const [wldPriceRaw, setWldPriceRaw] = useState<bigint | null>(null)
  const [wldFeedDecimals, setWldFeedDecimals] = useState<number>(8)
  const [estimatedWr, setEstimatedWr] = useState<string>('0')
  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const WRCREDIT_ADDRESS = process.env.NEXT_PUBLIC_WRCREDIT_ADDRESS!
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!

  // ✅ Load harga WR dari kontrak + harga WLD dari Chainlink feed
  useEffect(() => {
    if (!RPC_URL || !WRCREDIT_ADDRESS) return

    let mounted = true
    const provider = new ethers.JsonRpcProvider(RPC_URL)

    ;(async () => {
      try {
        // pricePerWrUsd() → uint256 1e8 → langsung bigint (v6)
        const wrc = new ethers.Contract(WRCREDIT_ADDRESS, WRCreditABI, provider)
        const rawPrice: bigint = await wrc.pricePerWrUsd()
        if (!mounted) return
        setPricePerWrUsdRaw(rawPrice)

        // ✅ Chainlink (WLD/USD)
        const feed = new ethers.Contract(CHAINLINK_WLD_USD_FEED, AGGREGATOR_V3_ABI, provider)
        const decimals = Number(await feed.decimals())
        const roundData = await feed.latestRoundData()
        const answer = BigInt(roundData[1]) // int256 → BigInt
        setWldFeedDecimals(decimals)
        setWldPriceRaw(answer)
      } catch (err) {
        console.error('Load rate error:', err)
      }
    })()

    return () => {
      mounted = false
    }
  }, [RPC_URL, WRCREDIT_ADDRESS])

  // ✅ Estimasi jumlah WR yang diterima
  useEffect(() => {
    if (!pricePerWrUsdRaw) {
      setEstimatedWr('0')
      return
    }
    const val = parseFloat(amount)
    if (!val || val <= 0) {
      setEstimatedWr('0')
      return
    }
    try {
      if (token === 'USDC') {
        // amount → USD → WR
        const usdcUnits = ethers.parseUnits(amount, 6)
        const usdWith8 = usdcUnits * BigInt(10 ** 2)
        const wr = (usdWith8 * BigInt(10 ** 18)) / pricePerWrUsdRaw
        setEstimatedWr(ethers.formatUnits(wr, 18))
      } else {
        if (!wldPriceRaw) return
        const wldUnits = ethers.parseUnits(amount, 18)
        const temp = wldUnits * wldPriceRaw
        const usd_feed = temp / BigInt(10 ** 18)
        let usd8: bigint
        if (wldFeedDecimals > 8) {
          usd8 = usd_feed / BigInt(10 ** (wldFeedDecimals - 8))
        } else if (wldFeedDecimals < 8) {
          usd8 = usd_feed * BigInt(10 ** (8 - wldFeedDecimals))
        } else {
          usd8 = usd_feed
        }
        const wr = (usd8 * BigInt(10 ** 18)) / pricePerWrUsdRaw
        setEstimatedWr(ethers.formatUnits(wr, 18))
      }
    } catch {
      setEstimatedWr('0')
    }
  }, [amount, token, pricePerWrUsdRaw, wldPriceRaw, wldFeedDecimals])

  // ✅ Kirim TX via world.sendTransaction
  const sendTxWorld = async (tx: { to: string; data: string; value?: string }) => {
    const world = (window as any).world
    if (!world?.sendTransaction) throw new Error('World App not available.')
    await world.sendTransaction({
      transaction: [
        {
          to: tx.to,
          data: tx.data,
          value: tx.value ?? '0x0',
        },
      ],
    })
  }

  // ✅ Proses utama approve → topup
  const handleConfirm = async () => {
    setErrorMsg(null)

    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Enter a valid amount')
      return
    }

    try {
      setStep('approving')
      const decimals = token === 'USDC' ? 6 : 18
      const amountUnits = ethers.parseUnits(amount, decimals)

      // 1) Approve
      const ifaceApprove = new ethers.Interface(ERC20_APPROVE_ABI)
      const tokenAddr = token === 'USDC' ? USDC_ADDRESS : WLD_ADDRESS
      const approveData = ifaceApprove.encodeFunctionData('approve', [
        WRCREDIT_ADDRESS,
        amountUnits,
      ])
      await sendTxWorld({ to: tokenAddr, data: approveData })

      // 2) Topup
      setStep('topup')
      const ifaceWRC = new ethers.Interface(WRCreditABI as any)
      const fn = token === 'USDC' ? 'topupWithUSDC' : 'topupWithWLD'
      const topupData = ifaceWRC.encodeFunctionData(fn, [amountUnits])
      await sendTxWorld({ to: WRCREDIT_ADDRESS, data: topupData })

      setStep('success')
      setToastType('success')
      setToastMessage('Topup submitted. Wait for confirmation.')

      setTimeout(() => {
        setStep('idle')
        onClose()
        onSuccess && onSuccess()
      }, 2000)
    } catch (err: any) {
      console.error('Topup error:', err)
      setStep('error')
      setErrorMsg(err?.message || 'Transaction failed')
      setToastType('error')
      setToastMessage(err?.message || 'Transaction failed/cancelled')
    }
  }

  if (!isOpen) return null

  const wrPriceHuman =
    pricePerWrUsdRaw ? Number(pricePerWrUsdRaw) / 1e8 : null
  const wldPriceHuman =
    wldPriceRaw && wldFeedDecimals
      ? Number(wldPriceRaw) / 10 ** wldFeedDecimals
      : null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-gray-900 text-white rounded-lg p-6 w-full max-w-md relative">
          <button
            onClick={() => step === 'idle' && onClose()}
            className="absolute top-3 right-3 text-gray-300"
            disabled={step !== 'idle'}
            aria-label="close"
          >
            ✕
          </button>

          <h3 className="text-xl font-semibold mb-3">Topup WR Credit</h3>

          <div className="mb-3">
            <label className="block text-sm text-gray-300 mb-1">Token</label>
            <select
              value={token}
              onChange={(e) => setToken(e.target.value as 'WLD' | 'USDC')}
              className="w-full p-2 rounded text-black"
              disabled={step !== 'idle'}
            >
              <option value="WLD">WLD</option>
              <option value="USDC">USDC</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-sm text-gray-300 mb-1">Amount ({token})</label>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 rounded text-black"
              placeholder={`Amount in ${token}`}
              disabled={step !== 'idle'}
            />
          </div>

          <div className="mb-3 text-sm text-gray-300">
            <div>WR price: {wrPriceHuman ? `$${wrPriceHuman.toFixed(8)}` : 'loading...'}</div>
            <div>WLD/USD: {wldPriceHuman ? `$${wldPriceHuman}` : 'loading...'}</div>
            <div className="mt-2 font-semibold">≈ You will receive: {estimatedWr} WR</div>
          </div>

          {errorMsg && <div className="text-red-400 mb-3 text-sm">{errorMsg}</div>}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => step === 'idle' && onClose()}
              className="px-3 py-1 rounded bg-gray-700"
              disabled={step !== 'idle'}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-3 py-1 rounded bg-green-600"
              disabled={step !== 'idle' || !amount || Number(amount) <= 0}
            >
              {step === 'idle' ? 'Confirm Topup' : 'Processing...'}
            </button>
          </div>
        </div>
      </div>

      {/* Step overlay */}
      {step !== 'idle' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
            {step === 'approving' && (
              <>
                <div className="mb-3 animate-spin">⏳</div>
                <div className="font-semibold">Step 1/2 — Approving token</div>
                <div className="text-sm text-gray-600 mt-2">Confirm the approve transaction in World App.</div>
              </>
            )}

            {step === 'topup' && (
              <>
                <div className="mb-3 animate-spin">⏳</div>
                <div className="font-semibold">Step 2/2 — Sending topup transaction</div>
                <div className="text-sm text-gray-600 mt-2">Confirm the topup transaction in World App.</div>
              </>
            )}

            {step === 'success' && (
              <>
                <div className="mb-3">✅</div>
                <div className="font-semibold text-green-600">Topup submitted</div>
                <div className="text-sm text-gray-600 mt-2">Wait for blockchain confirmation.</div>
              </>
            )}

            {step === 'error' && (
              <>
                <div className="mb-3 text-red-500">✖</div>
                <div className="font-semibold text-red-600">Transaction failed</div>
                <div className="text-sm text-gray-600 mt-2">{errorMsg}</div>
                <div className="mt-4">
                  <button onClick={() => setStep('idle')} className="px-3 py-1 rounded bg-gray-200">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
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
