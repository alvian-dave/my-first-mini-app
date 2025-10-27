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

function parseDecimalToBigInt(amount: string, decimals: number): bigint {
  // Robust parse decimal string -> integer (no float)
  // e.g. ("10.5", 6) => 10500000n
  const [intPart, fracPart = ''] = amount.toString().split('.')
  const frac = (fracPart + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(intPart + frac)
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
      return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 500 })
    }

    // connect to DB
    await dbConnect()

    // idempotency: cek DB kalau depositTxHash sudah ada
    const existing = await Topup.findOne({ depositTxHash: depositTxHash.toLowerCase() })
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

    // cek receipt status
    if (receipt.status !== 1) {
      return NextResponse.json({ ok: false, error: 'Deposit transaction failed on-chain' }, { status: 400 })
    }

    // (Optional but recommended) cek tx.to adalah USDC contract.
    // Kamu bilang frontend pakai MiniKit sehingga pasti transfer ke USDC contract,
    // namun check ini harmless and adds safety.
    if (!tx.to || tx.to.toLowerCase() !== USDC_CONTRACT.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Transaction to unexpected address (not USDC contract)' }, { status: 400 })
    }

    // decode input (transfer(address,uint256))
    const iface = new ethers.Interface(ERC20ABI as any)
    let parsed
    try {
      parsed = iface.parseTransaction({ data: tx.data, value: tx.value })
    } catch (err) {
      return NextResponse.json({ ok: false, error: 'Failed to decode ERC20 transfer data' }, { status: 400 })
    }

    if (parsed.name !== 'transfer') {
      return NextResponse.json({ ok: false, error: 'Transaction is not an ERC20 transfer' }, { status: 400 })
    }

    const [recipient, rawValue] = parsed.args as [string, bigint]

    // pastikan recipient adalah WR contract
    if (recipient.toLowerCase() !== WR_CONTRACT.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Transfer recipient is not WR contract' }, { status: 400 })
    }

    // cek pengirim cocok dengan userAddress
    if (tx.from.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Transaction sender does not match userAddress' }, { status: 400 })
    }

    // cek jumlah sesuai amountUSDC
    // USDC 6 decimals
    const rawExpectedUSDC = parseDecimalToBigInt(String(amountUSDC), 6)
    if (BigInt(rawValue.toString()) !== rawExpectedUSDC) {
      return NextResponse.json({ ok: false, error: 'Transfer amount mismatch with provided amountUSDC' }, { status: 400 })
    }

    // Hitung jumlah WR
    // Rate: 1 WR = 0.0050 USDC -> 1 USDC = 200 WR
    // rawUSDC (6d) * 200 * 10^(18-6)
    const multiplier = 200n
    const shift = 10n ** 12n // 18 - 6 = 12
    const amountWRRaw = rawExpectedUSDC * multiplier * shift // uint256 bigint

    // Mint via owner wallet
    const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider)
    const wr = new ethers.Contract(WR_CONTRACT, WRABI as any, wallet)

    // sebelum mint, simpan preliminary record (pending) untuk audit & idempotensi
    const pending = await Topup.create({
      userAddress: userAddress.toLowerCase(),
      depositTxHash: depositTxHash.toLowerCase(),
      amountUSDC: Number(amountUSDC),
      amountWR: (Number(amountUSDC) / 0.005).toString(),
      status: 'pending',
    })

    // call mint
    const mintTx = await wr.mint(userAddress, amountWRRaw)
    const mintReceipt = await mintTx.wait(1)

    if (mintReceipt.status !== 1) {
      // update record failed
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
      depositTxHash,
      amountWR: (Number(amountUSDC) / 0.005).toString(),
      record: pending,
    })
  } catch (err: any) {
    console.error('Error /api/topup:', err)
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
