// components/TopupModal.tsx
// Refactor: Uniswap pair price (WLD/USDC) + EIP-2612 permit single-click flow
// - Assumes tokens support permit (no fallback approve)
// - Uses world.sendTransaction if available, falls back to window.ethereum sendTransaction via MiniKit if present
// - Ethers v6 is used for read-only provider & utility functions

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import WRCreditABI from '@/abi/WRCredit.json'
import Toast from '@/components/Toast'
import { MiniKit } from '@worldcoin/minikit-js'; // Import MiniKit
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'; // Import useWaitForTransactionReceipt,


// ---------------- HARD-CODE: ganti sesuai jaringan / deploy kamu ----------------
const USDC_ADDRESS = '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1' // USDC.e
const WLD_ADDRESS = '0x2cFc85d8E48F8EAB294be644d9E25C3030863003' // WLD
const UNISWAP_PAIR = '0x610E319b3A3Ab56A0eD5562927D37c233774ba39' // WLD/USDC pair (Uniswap V2-like)
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
  // UI state
  const [token, setToken] = useState<'WLD' | 'USDC'>('WLD')
  const [amount, setAmount] = useState<string>('')
  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [transactionId, setTransactionId] = useState<string>(''); // State untuk transactionId

  // Price & reserves state
  const [pricePerWrUsdRaw, setPricePerWrUsdRaw] = useState<bigint | null>(null) // 1e8
  const [reserveWld, setReserveWld] = useState<bigint | null>(null)
  const [reserveUsdc, setReserveUsdc] = useState<bigint | null>(null)
  const [wldPriceRaw, setWldPriceRaw] = useState<bigint | null>(null) // 1e8

  // env
  const WRCREDIT_ADDRESS = process.env.NEXT_PUBLIC_WRCREDIT_ADDRESS!
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!
  const APP_ID = process.env.NEXT_PUBLIC_APP_ID!

  // provider (readonly) for fetching reserves & pricePerWrUsd
  const provider = useMemo(() => {
    if (!RPC_URL) return null
    return new ethers.JsonRpcProvider(RPC_URL)
  }, [RPC_URL])

  // compute estimated WR (string formatted) — mirrors on-chain arithmetic and scales
  const estimatedWr = useMemo(() => {
    try {
      if (!pricePerWrUsdRaw) return '0'
      const num = Number(amount)
      if (!num || num <= 0) return '0'

      if (token === 'USDC') {
        // usdc parseUnits 6 -> convert to 8 decimals
        const usdcUnits = ethers.parseUnits(amount || '0', 6) // bigint
        const usdWith8 = usdcUnits * BigInt(10 ** 2) // 6 -> 8
        const wr = (usdWith8 * BigInt(10 ** 18)) / pricePerWrUsdRaw
        return ethers.formatUnits(wr, 18)
      }

      // token === 'WLD'
      if (!wldPriceRaw) return '0'
      const wldUnits = ethers.parseUnits(amount || '0', 18)
      const temp = wldUnits * wldPriceRaw // (1e18 * 1e8)
      const usd_feed = temp / BigInt(10 ** 18) // now 1e8
      const wr = (usd_feed * BigInt(10 ** 18)) / pricePerWrUsdRaw
      return ethers.formatUnits(wr, 18)
    } catch (e) {
      return '0'
    }
  }, [amount, token, pricePerWrUsdRaw, wldPriceRaw])

  // human readable prices
  const wrPriceHuman = pricePerWrUsdRaw ? Number(pricePerWrUsdRaw) / 1e8 : null
  const wldPriceHuman = wldPriceRaw ? Number(wldPriceRaw) / 1e8 : null

  // ------------------- Fetch on open: pricePerWrUsd + Uniswap reserves -------------------
  useEffect(() => {
    if (!isOpen) return
    if (!provider || !WRCREDIT_ADDRESS) return

    let mounted = true

    ;(async () => {
      try {
        // 1) WR price
        const wrc = new ethers.Contract(WRCREDIT_ADDRESS, WRCreditABI, provider)
        const rawPrice: bigint = await wrc.pricePerWrUsd()
        if (!mounted) return
        setPricePerWrUsdRaw(rawPrice)

        // 2) Uniswap pair reserves — we hardcode PAIR/WLD/USDC addresses so we can assume order
        const pair = new ethers.Contract(UNISWAP_PAIR, UNISWAP_PAIR_ABI, provider)
        const [r0, r1] = await pair.getReserves()
        // We will query token0 / token1 just to be safe — but we use our hardcoded addresses to map
        const t0 = (await pair.token0()).toLowerCase()
        const t1 = (await pair.token1()).toLowerCase()
        const wldAddr = WLD_ADDRESS.toLowerCase()
        const usdcAddr = USDC_ADDRESS.toLowerCase()

        const r0big = BigInt(r0.toString())
        const r1big = BigInt(r1.toString())

        let wldR: bigint
        let usdcR: bigint

        if (t0 === wldAddr && t1 === usdcAddr) {
          wldR = r0big
          usdcR = r1big
        } else if (t0 === usdcAddr && t1 === wldAddr) {
          wldR = r1big
          usdcR = r0big
        } else {
          // fallback assume r0 = WLD, r1 = USDC (user said they'll hardcode both addresses)
          wldR = r0big
          usdcR = r1big
        }

        if (!mounted) return
        setReserveWld(wldR)
        setReserveUsdc(usdcR)

        // compute wldPriceRaw scaled 1e8
        // formula: price = (reserveUSDC / 1e6) / (reserveWLD / 1e18)
        // price * 1e8 = (reserveUSDC * 1e8 * 1e18) / (reserveWLD * 1e6)
        // simplify: (reserveUSDC * 10**20) / reserveWLD
        const priceRaw = wldR === 0n ? 0n : (usdcR * BigInt(10 ** 20)) / wldR
        setWldPriceRaw(priceRaw)
      } catch (err) {
        console.error('Load rate error:', err)
      }
    })()

    return () => {
      mounted = false
    }
  }, [isOpen, provider, WRCREDIT_ADDRESS])

  // optional: refresh reserves periodically while modal is open
  useEffect(() => {
    if (!isOpen) return
    if (!provider) return
    let mounted = true

    const interval = setInterval(async () => {
      try {
        const pair = new ethers.Contract(UNISWAP_PAIR, UNISWAP_PAIR_ABI, provider)
        const [r0, r1] = await pair.getReserves()
        const t0 = (await pair.token0()).toLowerCase()
        const t1 = (await pair.token1()).toLowerCase()
        const wldAddr = WLD_ADDRESS.toLowerCase()
        const usdcAddr = USDC_ADDRESS.toLowerCase()
        const r0big = BigInt(r0.toString())
        const r1big = BigInt(r1.toString())
        let wldR: bigint
        let usdcR: bigint
        if (t0 === wldAddr && t1 === usdcAddr) {
          wldR = r0big
          usdcR = r1big
        } else if (t0 === usdcAddr && t1 === wldAddr) {
          wldR = r1big
          usdcR = r0big
        } else {
          wldR = r0big
          usdcR = r1big
        }
        if (!mounted) return
        setReserveWld(wldR)
        setReserveUsdc(usdcR)
        const priceRaw = wldR === 0n ? 0n : (usdcR * BigInt(10 ** 20)) / wldR
        setWldPriceRaw(priceRaw)
      } catch (e) {
        // ignore refresh failures
      }
    }, 30_000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isOpen, provider])

  // ---------------- helper: split signature ----------------
  function splitSignature(sig: string) {
    if (!sig) throw new Error('Empty signature')
    const s = sig.startsWith('0x') ? sig.slice(2) : sig
    if (s.length !== 130 && s.length !== 132) throw new Error('Invalid signature length')
    const r = '0x' + s.slice(0, 64)
    const sPart = '0x' + s.slice(64, 128)
    let vHex = s.length === 130 ? s.slice(128, 130) : s.slice(130, 132)
    let v = parseInt(vHex, 16)
    if (v < 27) v += 27
    return { r, s: sPart, v }
  }

  // ---------------- helper: sign permit typed data ----------------
  // build typed data for EIP-2612 permit (domain uses token.name(), version '1')
  async function buildPermitTypedData(tokenAddr: string, owner: string, spender: string, value: bigint, deadline: number) {
    if (!provider) throw new Error('No provider')
    const token = new ethers.Contract(tokenAddr, [...ERC20_NAME_ABI, ...ERC20_NONCES_ABI], provider)
    const name = String(await token.name())
    const nonce = BigInt((await token.nonces(owner)).toString())
    const network = await provider.getNetwork()
    const chainId = Number(network.chainId)

    const domain = {
      name,
      version: '1',
      chainId,
      verifyingContract: tokenAddr,
    }

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    }

    const message = {
      owner: owner,
      spender: spender,
      value: value.toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
    }

    return { domain, types, message }
  }

  // sign typed data using World App or fallback to window.ethereum eth_signTypedData_v4
  async function signTypedData(typed: any) {
    try {
      const world = (window as any).world
      // World App (if provides signTypedData) — API may differ across implementations
      if (world && typeof world.signTypedData === 'function') {
        // some implementations accept { address, data }
        const sig = await world.signTypedData({ address: userAddress, data: typed })
        return sig
      }

      // fallback: window.ethereum
      const eth = (window as any).ethereum
      if (eth && typeof eth.request === 'function') {
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
        // eth_signTypedData_v4 expects JSON string of typed data as second param
        const sig = await eth.request({
          method: 'eth_signTypedData_v4',
          params: [userAddress, payload],
        })
        return sig
      }

      throw new Error('No method available for signing typed data')
    } catch (error) {
      console.error('Signature error:', error)
      throw error // Re-throw to be caught in handleConfirm
    }
  }

  // -------------------- MAIN: handleConfirm --------------------
  const handleConfirm = async () => {
    setErrorMsg(null)
    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Enter a valid amount')
      return
    }
    if (!WRCREDIT_ADDRESS) {
      setErrorMsg('WRCredit address not configured')
      return
    }

    try {
      // prepare
      const decimals = token === 'USDC' ? 6 : 18
      const amountUnits = ethers.parseUnits(amount, decimals) // bigint

      // build typed data
      setStep('signing')
      const deadline = Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour
      const tokenAddr = token === 'USDC' ? USDC_ADDRESS : WLD_ADDRESS
      const typed = await buildPermitTypedData(tokenAddr, userAddress, WRCREDIT_ADDRESS, amountUnits, deadline)
      const sig = await signTypedData(typed)
      const { r, s, v } = splitSignature(sig)

      // encode contract call and send tx
      setStep('sending')
      const ifaceWRC = new ethers.Interface(WRCreditABI as any)
      const fn = token === 'USDC' ? 'topupWithUSDCWithPermit' : 'topupWithWLDWithPermit'

      // --- Send transaction using MiniKit ---
      const MiniKit = (window as any).MiniKit;
      if (!MiniKit || !MiniKit.commandsAsync || typeof MiniKit.commandsAsync.sendTransaction !== 'function') {
        throw new Error('MiniKit is not available');
      }

      const transaction = {
        address: WRCREDIT_ADDRESS,
        abi: WRCreditABI, // Ensure this ABI is up-to-date
        functionName: fn,
        args: [amountUnits, deadline, v, r, s],
      };

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [transaction],
      });

      if (finalPayload.status === 'error') {
        console.error('Error sending transaction', finalPayload);
        throw new Error(finalPayload.error || 'Transaction failed');
      }
      const transactionId = finalPayload.transaction_id;
      setTransactionId(transactionId); // Set transactionId state
      setStep('success');
      setToastType('success');
      setToastMessage(`Topup submitted. Transaction ID: ${transactionId}`);

    } catch (err: any) {
      console.error('Topup error:', err)
      setStep('error')
      setErrorMsg(err?.message || String(err) || 'Transaction failed')
      setToastType('error')
      setToastMessage(err?.message || 'Transaction failed/cancelled')
    }
  }

  // Menggunakan useWaitForTransactionReceipt untuk memantau status transaksi
  const { data: transactionReceipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    client: provider, // Menggunakan provider ethers sebagai client
    appConfig: {
      app_id: APP_ID, // Menggunakan APP_ID dari environment variables
    },
    transactionId: transactionId, // Menggunakan transactionId dari state
  });

  // Efek untuk menangani status transaksi yang berhasil
  useEffect(() => {
    if (isConfirmed && transactionReceipt) {
      console.log('Transaction Confirmed!', transactionReceipt);
      setToastType('success');
      setToastMessage('Topup confirmed on blockchain!');
      setTimeout(() => {
        setStep('idle');
        onClose();
        onSuccess && onSuccess();
      }, 3000); // Menutup modal setelah 3 detik
    }
  }, [isConfirmed, transactionReceipt, onClose, onSuccess]);

  // Efek untuk menangani kesalahan selama pemantauan transaksi
  useEffect(() => {
    if (transactionId && !isConfirming && !isConfirmed && step === 'success') {
      console.log('Transaction mungkin gagal atau belum dikonfirmasi.');
      // Jika transaksi tidak dikonfirmasi setelah beberapa waktu, tampilkan pesan kesalahan
      setToastType('error');
      setToastMessage('Transaksi mungkin gagal atau belum dikonfirmasi.');
      setStep('error');
      setErrorMsg('Transaksi mungkin gagal atau belum dikonfirmasi.');
    }
  }, [transactionId, isConfirming, isConfirmed, step]);

  if (!isOpen) return null

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
            <div>WLD/USD: {wldPriceHuman ? `$${wldPriceHuman.toFixed(6)}` : 'loading...'}</div>
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
              {step === 'idle' ? 'Confirm Topup' : step === 'signing' ? 'Waiting signature...' : step === 'sending' ? 'Processing...' : 'Processing...'}
            </button>
          </div>
        </div>
      </div>

      {/* Step overlay */}
      {step !== 'idle' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
            {step === 'signing' && (
              <>
                <div className="mb-3 animate-spin">⏳</div>
                <div className="font-semibold">Requesting signature</div>
                <div className="text-sm text-gray-600 mt-2">Please sign the permit in World App / wallet.</div>
              </>
            )}

            {step === 'sending' && (
              <>
                <div className="mb-3 animate-spin">⏳</div>
                <div className="font-semibold">Sending transaction</div>
                <div className="text-sm text-gray-600 mt-2">Confirm the transaction in World App.</div>
              </>
            )}

            {step === 'success' && (
              <>
                <div className="mb-3">✅</div>
                <div className="font-semibold text-green-600">Topup submitted</div>
                <div className="text-sm text-gray-600 mt-2">
                  Waiting for blockchain confirmation.
                  <br />
                  Transaction ID: {transactionId}
                  {isConfirming && <div>Konfirmasi...</div>}
                  {isConfirmed && <div>Terkonfirmasi!</div>}
                </div>
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