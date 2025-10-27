// src/app/api/topup/route.ts
import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import dbConnect from '@/lib/mongodb'
import Topup from '@/models/Topup'
import ERC20ABI from '@/abi/ERC20.json'
import WRABI from '@/abi/WRCredit.json'

type Body = {
  depositTxHash: string
  userAddress: string
  amountUSDC: string | number // e.g. "10.5" or 10.5
}

/**
 * Parse decimal string to bigint with given decimals.
 * e.g. ("10.5", 6) => 10500000n
 */
function parseDecimalToBigInt(amount: string, decimals: number): bigint {
  const [intPart, fracPart = ''] = amount.toString().split('.')
  const frac = (fracPart + '0'.repeat(decimals)).slice(0, decimals)
  const numeric = intPart + frac
  // Remove leading zeros
  const trimmed = numeric.replace(/^0+(?!$)/, '')
  return BigInt(trimmed || '0')
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const { depositTxHash, userAddress, amountUSDC } = body

    if (!depositTxHash || !userAddress || typeof amountUSDC === 'undefined') {
      return NextResponse.json({ ok: false, error: 'Missing parameters' }, { status: 400 })
    }

    // env
    const RPC = process.env.NEXT_PUBLIC_RPC_URL
    const USDC_CONTRACT = process.env.NEXT_PUBLIC_USDC_CONTRACT
    const WR_CONTRACT = process.env.NEXT_PUBLIC_WR_CONTRACT
    const OWNER_PRIVATE_KEY = process.env.PRIVATE_KEY
    
    if (!RPC || !USDC_CONTRACT || !WR_CONTRACT || !OWNER_PRIVATE_KEY) {
      console.error('Missing required env vars', { RPC: !!RPC, USDC_CONTRACT: !!USDC_CONTRACT, WR_CONTRACT: !!WR_CONTRACT, OWNER_PRIVATE_KEY: !!OWNER_PRIVATE_KEY })
      return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 500 })
    }

    // connect to DB
    await dbConnect()

    // idempotency: cek DB kalau depositTxHash sudah ada
    const normalizedDeposit = depositTxHash.toLowerCase()
    const existing = await Topup.findOne({ depositTxHash: normalizedDeposit })
    if (existing) {
      return NextResponse.json({ ok: true, message: 'Already processed', record: existing })
    }

    // provider
    const provider = new ethers.JsonRpcProvider(RPC)

    // ambil tx & receipt
    const tx = await provider.getTransaction(depositTxHash)
    const receipt = await provider.getTransactionReceipt(depositTxHash)
    if (!tx || !receipt) {
      return NextResponse.json({ ok: false, error: 'Transaction not found on chain' }, { status: 404 })
    }

    // cek receipt status (1 = success)
    if (receipt.status !== 1) {
      return NextResponse.json({ ok: false, error: 'Deposit transaction failed on-chain' }, { status: 400 })
    }

    // Optional safety: pastikan tx.to adalah USDC contract
    if (!tx.to || tx.to.toLowerCase() !== USDC_CONTRACT.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Transaction to unexpected address (not USDC contract)' }, { status: 400 })
    }

    // decode input (transfer(address,uint256)) safely
    const iface = new ethers.Interface(ERC20ABI as any)
    let parsed: ethers.TransactionDescription | null = null
    try {
      // parseTransaction may throw if data doesn't match any function
      parsed = iface.parseTransaction({ data: tx.data, value: (tx as any).value })
    } catch (err) {
      parsed = null
    }

    if (!parsed || parsed.name !== 'transfer') {
      return NextResponse.json({ ok: false, error: 'Transaction is not an ERC20 transfer' }, { status: 400 })
    }

    // args: [to, value]
    const args = parsed.args
    if (!args || args.length < 2) {
      return NextResponse.json({ ok: false, error: 'Transfer args missing' }, { status: 400 })
    }

    const recipient = String(args[0])
    // raw value might be bigint (ethers v6 uses bigint for uint256)
    const rawValue: bigint = (() => {
      const v = args[1] as any
      if (typeof v === 'bigint') return v
      if (typeof v === 'string') return BigInt(v)
      if (typeof v === 'number') return BigInt(Math.floor(v))
      // fallback: try to convert
      return BigInt(String(v))
    })()

    // pastikan recipient adalah WR contract
    if (recipient.toLowerCase() !== WR_CONTRACT.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Transfer recipient is not WR contract' }, { status: 400 })
    }

    // cek pengirim cocok dengan userAddress
    if ((tx.from || '').toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Transaction sender does not match userAddress' }, { status: 400 })
    }

    // cek jumlah sesuai amountUSDC (USDC 6 decimals)
    const rawExpectedUSDC = parseDecimalToBigInt(String(amountUSDC), 6)
    if (rawValue !== rawExpectedUSDC) {
      return NextResponse.json({ ok: false, error: 'Transfer amount mismatch with provided amountUSDC' }, { status: 400 })
    }

    // Hitung jumlah WR
    // Rate: 1 WR = 0.0050 USDC -> 1 USDC = 200 WR
    // rawUSDC (6d) * 200 * 10^(18-6)
    const multiplier = 200n
    const shift = 10n ** 12n // 18 - 6 = 12
    const amountWRRaw = rawExpectedUSDC * multiplier * shift // bigint

    // Mint via owner wallet
    const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider)
    const wr = new ethers.Contract(WR_CONTRACT, WRABI as any, wallet)

    // Save preliminary pending record (idempotency & audit)
    const pending = await Topup.create({
      userAddress: userAddress.toLowerCase(),
      depositTxHash: normalizedDeposit,
      amountUSDC: Number(amountUSDC),
      amountWR: (Number(amountUSDC) / 0.005).toString(),
      status: 'pending',
    })

    // call mint (assumes mint(address,uint256) and owner key has permission)
    const mintTx = await wr.mint(userAddress, amountWRRaw)
    const mintReceipt = await mintTx.wait(1)

    if (mintReceipt.status !== 1) {
      pending.status = 'failed'
      // @ts-ignore
      pending.mintTxHash = mintTx.hash
      await pending.save()
      return NextResponse.json({ ok: false, error: 'Mint transaction failed', mintTxHash: mintTx.hash }, { status: 500 })
    }

    // update db success
    pending.status = 'minted'
    // @ts-ignore
    pending.mintTxHash = mintTx.hash
    await pending.save()

    return NextResponse.json({
      ok: true,
      message: 'Minted WR successfully',
      mintTxHash: mintTx.hash,
      depositTxHash: normalizedDeposit,
      amountWR: (Number(amountUSDC) / 0.005).toString(),
      record: pending,
    })
  } catch (err: any) {
    console.error('Error /api/topup:', err)
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
