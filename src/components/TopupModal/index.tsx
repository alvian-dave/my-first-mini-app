'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import WRCreditABI from '@/abi/WRCredit.json'
import Toast from '@/components/Toast'

// ---------------- HARD-CODE: ganti sesuai jaringan / deploy kamu ----------------
const USDC_ADDRESS = '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1' // USDC.e
const WLD_ADDRESS = '0x2cFc85d8E48F8EAB294be644d9E25C3030863003' // WLD
const UNISWAP_PAIR = '0x610E319b3A3Ab56A0eD5562927D37c233774ba39' // WLD/USDC pair
// -----------------------------------------------------------------------------  

const UNISWAP_PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
]

const ERC20_NAME_ABI = ['function name() view returns (string)']
const ERC20_NONCES_ABI = ['function nonces(address) view returns (uint256)']

type Step = 'idle' | 'signing' | 'sending' | 'success' | 'error'

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

  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const [pricePerWrUsdRaw, setPricePerWrUsdRaw] = useState<bigint | null>(null) // 1e8
  const [wldPriceRaw, setWldPriceRaw] = useState<bigint | null>(null) // 1e8

  const WRCREDIT_ADDRESS = process.env.NEXT_PUBLIC_WRCREDIT_ADDRESS!
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!

  const provider = useMemo(() => {
    if (!RPC_URL) return null
    return new ethers.JsonRpcProvider(RPC_URL)
  }, [RPC_URL])

  // ------------------- Fetch price + reserves -------------------
  useEffect(() => {
    if (!isOpen) return
    if (!provider || !WRCREDIT_ADDRESS) return

    let mounted = true

    const fetchPrices = async () => {
      try {
        // WR price
        const wrc = new ethers.Contract(WRCREDIT_ADDRESS, WRCreditABI, provider)
        const rawPrice: bigint = await wrc.pricePerWrUsd()
        if (!mounted) return
        setPricePerWrUsdRaw(rawPrice)

        // Uniswap pair
        const pair = new ethers.Contract(UNISWAP_PAIR, UNISWAP_PAIR_ABI, provider)
        const [r0, r1] = await pair.getReserves()
        const t0 = (await pair.token0()).toLowerCase()
        const t1 = (await pair.token1()).toLowerCase()
        const wldAddr = WLD_ADDRESS.toLowerCase()
        const usdcAddr = USDC_ADDRESS.toLowerCase()

        const r0big = BigInt(r0.toString())
        const r1big = BigInt(r1.toString())
        let wldR: bigint, usdcR: bigint

        if (t0 === wldAddr && t1 === usdcAddr) {
          wldR = r0big
          usdcR = r1big
        } else if (t0 === usdcAddr && t1 === wldAddr) {
          wldR = r1big
          usdcR = r0big
        } else {
          console.warn('Uniswap pair token order unknown, fallback reserves')
          wldR = r0big
          usdcR = r1big
        }

        const priceRaw = wldR === 0n ? 0n : (usdcR * 10n ** 20n) / wldR
        if (!mounted) return
        setWldPriceRaw(priceRaw)

        console.log('✅ Loaded WR price & WLD/USD price:', rawPrice.toString(), priceRaw.toString())
      } catch (err) {
        console.error('Fetch price error:', err)
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 30_000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isOpen, provider, WRCREDIT_ADDRESS])

  // ------------------- compute estimated WR -------------------
  const estimatedWr = useMemo(() => {
    try {
      if (!pricePerWrUsdRaw) return '0'
      const num = Number(amount)
      if (!num || num <= 0) return '0'

      if (token === 'USDC') {
        const usdcUnits = ethers.parseUnits(amount || '0', 6)
        const usdWith8 = usdcUnits * 100n
        const wr = (usdWith8 * 10n ** 18n) / pricePerWrUsdRaw
        return ethers.formatUnits(wr, 18)
      }

      // token === 'WLD'
      if (!wldPriceRaw) return '0'
      const wldUnits = ethers.parseUnits(amount || '0', 18)
      const temp = wldUnits * wldPriceRaw
      const usd_feed = temp / 10n ** 18n
      const wr = (usd_feed * 10n ** 18n) / pricePerWrUsdRaw
      return ethers.formatUnits(wr, 18)
    } catch {
      return '0'
    }
  }, [amount, token, pricePerWrUsdRaw, wldPriceRaw])

  const wrPriceHuman = pricePerWrUsdRaw ? Number(pricePerWrUsdRaw) / 1e8 : null
  const wldPriceHuman = wldPriceRaw ? Number(wldPriceRaw) / 1e8 : null

  // ------------------- helpers: permit -------------------
  function splitSignature(sig: string) {
    if (!sig) throw new Error('Empty signature')
    const s = sig.startsWith('0x') ? sig.slice(2) : sig
    const r = '0x' + s.slice(0, 64)
    const sPart = '0x' + s.slice(64, 128)
    let vHex = s.length === 130 ? s.slice(128, 130) : s.slice(130, 132)
    let v = parseInt(vHex, 16)
    if (v < 27) v += 27
    return { r, s: sPart, v }
  }

  async function buildPermitTypedData(tokenAddr: string, owner: string, spender: string, value: bigint, deadline: number) {
    if (!provider) throw new Error('No provider')
    const token = new ethers.Contract(tokenAddr, [...ERC20_NAME_ABI, ...ERC20_NONCES_ABI], provider)
    const name = String(await token.name())
    const nonce = BigInt((await token.nonces(owner)).toString())
    const chainId = Number((await provider.getNetwork()).chainId)

    return {
      domain: { name, version: '1', chainId, verifyingContract: tokenAddr },
      types: { Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ]},
      message: { owner, spender, value: value.toString(), nonce: nonce.toString(), deadline: deadline.toString() },
    }
  }

  async function signTypedData(typed: any) {
    const world = (window as any).world
    if (world?.signTypedData) return await world.signTypedData({ address: userAddress, data: typed })
    const eth = (window as any).ethereum
    if (eth?.request) {
      const payload = JSON.stringify({
        domain: typed.domain,
        message: typed.message,
        primaryType: 'Permit',
        types: { EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ], ...typed.types },
      })
      return await eth.request({ method: 'eth_signTypedData_v4', params: [userAddress, payload] })
    }
    throw new Error('No method available for signing typed data')
  }

  async function sendTransactionViaPlatform(tx: { to: string; data: string; value?: string }) {
    const world = (window as any).world
    if (world?.sendTransaction) {
      await world.sendTransaction({ transaction: [{ to: tx.to, data: tx.data, value: tx.value ?? '0x0' }] })
      return
    }
    throw new Error('No supported transaction sender found')
  }

  // ------------------- MAIN: handleConfirm -------------------
  const handleConfirm = async () => {
    setErrorMsg(null)
    if (!amount || Number(amount) <= 0) return setErrorMsg('Enter a valid amount')
    if (!WRCREDIT_ADDRESS) return setErrorMsg('WRCredit address not configured')

    try {
      const decimals = token === 'USDC' ? 6 : 18
      const amountUnits = ethers.parseUnits(amount, decimals)
      const deadline = Math.floor(Date.now() / 1000) + 3600
      const tokenAddr = token === 'USDC' ? USDC_ADDRESS : WLD_ADDRESS

      setStep('signing')
      const typed = await buildPermitTypedData(tokenAddr, userAddress, WRCREDIT_ADDRESS, amountUnits, deadline)
      const sig = await signTypedData(typed)
      const { r, s, v } = splitSignature(sig)

      setStep('sending')
      const ifaceWRC = new ethers.Interface(WRCreditABI as any)
      const fn = token === 'USDC' ? 'topupWithUSDCWithPermit' : 'topupWithWLDWithPermit'
      const data = ifaceWRC.encodeFunctionData(fn, [amountUnits, deadline, v, r, s])

      await sendTransactionViaPlatform({ to: WRCREDIT_ADDRESS, data })

      setStep('success')
      setToastType('success')
      setToastMessage('Topup submitted. Wait for confirmation.')

      setTimeout(() => {
        setStep('idle')
        onClose()
        onSuccess?.()
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white rounded-lg p-6 w-full max-w-md relative">
        <button onClick={() => step === 'idle' && onClose()} className="absolute top-3 right-3 text-gray-300" >✕</button>
        <h3 className="text-xl font-semibold mb-3">Topup WR Credit</h3>

        <div className="mb-3">
          <label className="block text-sm text-gray-300 mb-1">Token</label>
          <select value={token} onChange={(e) => setToken(e.target.value as 'WLD' | 'USDC')} className="w-full p-2 rounded text-black" disabled={step !== 'idle'}>
            <option value="WLD">WLD</option>
            <option value="USDC">USDC</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="block text-sm text-gray-300 mb-1">Amount ({token})</label>
          <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 rounded text-black" placeholder={`Amount in ${token}`} disabled={step !== 'idle'} />
        </div>

        <div className="mb-3 text-sm text-gray-300">
          <div>WR price: {wrPriceHuman ? `$${wrPriceHuman.toFixed(8)}` : 'loading...'}</div>
          <div>WLD/USD: {wldPriceHuman ? `$${wldPriceHuman.toFixed(6)}` : 'loading...'}</div>
          <div className="mt-2 font-semibold">≈ You will receive: {estimatedWr} WR</div>
        </div>

        {errorMsg && <div className="text-red-400 mb-3 text-sm">{errorMsg}</div>}

        <div className="flex gap-2 justify-end">
          <button onClick={() => step === 'idle' && onClose()} className="px-3 py-1 rounded bg-gray-700" disabled={step !== 'idle'}>Cancel</button>
          <button onClick={handleConfirm} className="px-3 py-1 rounded bg-green-600" disabled={step !== 'idle' || !amount || Number(amount) <= 0}>
            {step === 'idle' ? 'Confirm Topup' : step === 'signing' ? 'Waiting signature...' : 'Processing...'}
          </button>
        </div>

        {/* Toast */}
        {toastMessage && <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />}
      </div>
    </div>
  )
}
