// components/TopupModal.tsx
'use client'

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import WRCreditABI from '@/abi/WRCredit.json'
import Toast from '@/components/Toast'

/**
 * IMPORTANT:
 * - This component is designed to run INSIDE World App Mini App environment.
 * - It uses world.sendTransaction(...) as described in World docs (send-transaction).
 * - If `window.world` is not present, the component will not attempt wallet tx.
 *
 * Config:
 * - NEXT_PUBLIC_WRCREDIT_ADDRESS and NEXT_PUBLIC_RPC_URL must be in .env
 * - USDC_ADDRESS, WLD_ADDRESS, CHAINLINK_WLD_USD_FEED are hardcoded below (replace them)
 */

// ------------------ HARD-CODE (replace with real addresses) ------------------
const USDC_ADDRESS = '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1' // <-- replace
const WLD_ADDRESS = '0x2cFc85d8E48F8EAB294be644d9E25C3030863003'  // <-- replace
const CHAINLINK_WLD_USD_FEED = '0x4e1C6B168DCFD7758bC2Ab9d2865f1895813D236' // <-- replace
// ---------------------------------------------------------------------------

// Minimal ABIs used for encoding
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
  userAddress: string // wallet address from World App session
}

export default function TopupModal({ isOpen, onClose, onSuccess, userAddress }: TopupModalProps) {
  const [token, setToken] = useState<'WLD' | 'USDC'>('WLD')
  const [amount, setAmount] = useState<string>('')
  const [pricePerWrUsdRaw, setPricePerWrUsdRaw] = useState<bigint | null>(null) // scaled 1e8
  const [wldPriceRaw, setWldPriceRaw] = useState<bigint | null>(null)
  const [wldFeedDecimals, setWldFeedDecimals] = useState<number>(8)
  const [estimatedWr, setEstimatedWr] = useState<string>('0')
  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const WRCREDIT_ADDRESS = process.env.NEXT_PUBLIC_WRCREDIT_ADDRESS as string
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL as string

  // load on-chain rates using RPC provider
  useEffect(() => {
    if (!RPC_URL || !WRCREDIT_ADDRESS) {
      console.error('Please set NEXT_PUBLIC_RPC_URL and NEXT_PUBLIC_WRCREDIT_ADDRESS in .env')
      return
    }

    let mounted = true
    const provider = new ethers.JsonRpcProvider(RPC_URL)

    ;(async () => {
      try {
        // read pricePerWrUsd from WRCredit
        const wrc = new ethers.Contract(WRCREDIT_ADDRESS, WRCreditABI, provider)
        const priceRaw: ethers.BigNumber = await wrc.pricePerWrUsd() // uint256 scaled 1e8
        if (!mounted) return
        setPricePerWrUsdRaw(priceRaw.toBigInt())

        // read Chainlink WLD/USD
        const feed = new ethers.Contract(CHAINLINK_WLD_USD_FEED, AGGREGATOR_V3_ABI, provider)
        const decimals: number = Number(await feed.decimals())
        const roundData = await feed.latestRoundData()
        const raw = BigInt(roundData[1].toString())
        if (!mounted) return
        setWldFeedDecimals(decimals)
        setWldPriceRaw(raw)
      } catch (err) {
        console.error('Failed to load on-chain rates', err)
      }
    })()

    return () => { mounted = false }
  }, [RPC_URL, WRCREDIT_ADDRESS])

  // calculate estimated WR using integer math same as contract
  useEffect(() => {
    if (!pricePerWrUsdRaw) { setEstimatedWr('0'); return }
    const amt = Number(amount)
    if (!amt || amt <= 0) { setEstimatedWr('0'); return }

    try {
      if (token === 'USDC') {
        // usdcUnits = amt * 1e6
        const usdcUnits = BigInt(Math.round(amt * 10 ** 6))
        // usdWith8 = usdcUnits * 10^(8-6) = *100
        const usdWith8 = usdcUnits * BigInt(10 ** 2)
        // wrAmount = (usdWith8 * 1e18) / pricePerWrUsdRaw
        const wrAmount = (usdWith8 * BigInt(10 ** 18)) / pricePerWrUsdRaw
        const human = ethers.formatUnits(wrAmount.toString(), 18)
        setEstimatedWr(human)
      } else {
        if (!wldPriceRaw) { setEstimatedWr('0'); return }
        // wldUnits = amt * 1e18
        const wldUnits = BigInt(Math.round(amt * 10 ** 18))
        // temp = wldUnits * price (price in feed decimals)
        const temp = wldUnits * wldPriceRaw // BigInt
        // usd_in_feedDecimals = temp / 1e18
        const usd_in_feedDecimals = temp / BigInt(10 ** 18)
        // adjust feed decimals -> to 1e8 scale
        let usdWith8: bigint
        if (wldFeedDecimals > 8) {
          usdWith8 = usd_in_feedDecimals / BigInt(10 ** (wldFeedDecimals - 8))
        } else if (wldFeedDecimals < 8) {
          usdWith8 = usd_in_feedDecimals * BigInt(10 ** (8 - wldFeedDecimals))
        } else {
          usdWith8 = usd_in_feedDecimals
        }
        // wrAmount = (usdWith8 * 1e18) / pricePerWrUsdRaw
        const wrAmount = (usdWith8 * BigInt(10 ** 18)) / pricePerWrUsdRaw
        const human = ethers.formatUnits(wrAmount.toString(), 18)
        setEstimatedWr(human)
      }
    } catch (err) {
      console.error('estimation error', err)
      setEstimatedWr('0')
    }
  }, [amount, token, pricePerWrUsdRaw, wldPriceRaw, wldFeedDecimals])

  // helper: encode data via ethers.Interface
  const encodeApproveData = (tokenAddress: string, spender: string, amountUnitsStr: string) => {
    const iface = new ethers.Interface(ERC20_APPROVE_ABI)
    return iface.encodeFunctionData('approve', [spender, amountUnitsStr])
  }

  const encodeTopupData = (tokenType: 'USDC' | 'WLD', amountUnitsStr: string) => {
    const iface = new ethers.Interface(WRCreditABI as any)
    const fn = tokenType === 'USDC' ? 'topupWithUSDC' : 'topupWithWLD'
    return iface.encodeFunctionData(fn, [amountUnitsStr])
  }

  // send using world.sendTransaction per World docs
  const sendTxWorld = async (tx: { to: string; data: string; value?: string }) => {
    const world = (window as any).world
    if (!world || typeof world.sendTransaction !== 'function') {
      throw new Error('world.sendTransaction not available — run this inside World App Mini App.')
    }
    // docs: sendTransaction takes an object with transaction array
    const payload = await world.sendTransaction({ transaction: [{ to: tx.to, data: tx.data, value: tx.value || '0x0' }] })
    return payload
  }

  // main flow: approve -> topup (using world.sendTransaction)
  const handleConfirm = async () => {
    setErrorMsg(null)
    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Please enter a valid amount')
      return
    }
    if (!pricePerWrUsdRaw) {
      setErrorMsg('Rates not loaded yet')
      return
    }
    if (!WRCREDIT_ADDRESS || !RPC_URL) {
      setErrorMsg('Missing contract address or RPC config')
      return
    }
    try {
      setStep('approving')

      // amount units (string) according to decimals
      const decimals = token === 'USDC' ? 6 : 18
      const amountUnits = ethers.parseUnits(amount, decimals)
      const amountUnitsStr = amountUnits.toString()

      // encode approve data
      const tokenAddress = token === 'USDC' ? USDC_ADDRESS : WLD_ADDRESS
      const approveData = encodeApproveData(tokenAddress, WRCREDIT_ADDRESS, amountUnitsStr)

      // send approve via world
      await sendTxWorld({ to: tokenAddress, data: approveData })

      // move to topup step
      setStep('topup')

      // encode topup data and send
      const topupData = encodeTopupData(token, amountUnitsStr)
      await sendTxWorld({ to: WRCREDIT_ADDRESS, data: topupData })

      // done
      setStep('success')
      setToastType('success')
      setToastMessage('Topup submitted — confirm both transactions in your wallet and wait for chain confirmation.')
      if (onSuccess) onSuccess()
      setTimeout(() => {
        setStep('idle')
        onClose()
      }, 2200)
    } catch (err: any) {
      console.error('Topup flow error', err)
      setStep('error')
      setErrorMsg(err?.message || 'Topup failed or cancelled')
      setToastType('error')
      setToastMessage(err?.message || 'Topup failed or cancelled')
    }
  }

  if (!isOpen) return null

  // format human prices for display
  const wrPriceHuman = pricePerWrUsdRaw ? Number(pricePerWrUsdRaw) / 1e8 : null
  const wldPriceHuman = (wldPriceRaw && wldFeedDecimals) ? Number(wldPriceRaw) / (10 ** wldFeedDecimals) : null

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
