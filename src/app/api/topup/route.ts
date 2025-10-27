import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import dbConnect from '@/lib/mongodb'
import Topup from '@/models/Topup'
import WRABI from '@/abi/WRCredit.json'

type Body = {
  depositTxHash: string // Worldcoin transaction ID (not on-chain)
  userAddress: string
  amountUSDC: string | number
}

// convert decimal string ke bigint (USDC 6 decimals)
function parseDecimalToBigInt(amount: string, decimals: number): bigint {
  const [intPart, fracPart = ''] = amount.toString().split('.')
  const frac = (fracPart + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(intPart + frac)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const { depositTxHash, userAddress, amountUSDC } = body

    if (!depositTxHash || !userAddress || !amountUSDC) {
      return NextResponse.json({ ok: false, error: 'Missing parameters' }, { status: 400 })
    }

    // ===== ENV =====
    const RPC = process.env.NEXT_PUBLIC_RPC_URL
    const WR_CONTRACT = process.env.NEXT_PUBLIC_WR_CONTRACT
    const OWNER_PRIVATE_KEY = process.env.PRIVATE_KEY
    const WORLD_APP_ID = process.env.NEXT_PUBLIC_APP_ID
    const WORLD_API_KEY = process.env.WORLD_APP_API_KEY

    if (!RPC || !WR_CONTRACT || !OWNER_PRIVATE_KEY || !WORLD_APP_ID || !WORLD_API_KEY) {
      return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 500 })
    }

    await dbConnect()

    // ===== CEK JIKA SUDAH PERNAH DIPROSES =====
    const normalizedDeposit = depositTxHash.toLowerCase()
    const existing = await Topup.findOne({ depositTxHash: normalizedDeposit })
    if (existing) {
      return NextResponse.json({ ok: true, message: 'Already processed', record: existing })
    }

    // ===== STEP 1: Ambil hash on-chain dari Worldcoin API =====
    const wcRes = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${depositTxHash}?app_id=${WORLD_APP_ID}&type=transaction`,
      { headers: { Authorization: `Bearer ${WORLD_API_KEY}` } }
    )

    if (!wcRes.ok) {
      const errMsg = await wcRes.text()
      return NextResponse.json({ ok: false, error: 'Worldcoin API error: ' + errMsg }, { status: 502 })
    }

    const wcData = await wcRes.json()
    const onchainHash = wcData.transactionHash
    if (!onchainHash) {
      return NextResponse.json({ ok: false, error: 'No on-chain hash found from Worldcoin API' }, { status: 404 })
    }

    // ===== STEP 2: Validasi transaksi di blockchain =====
    const provider = new ethers.JsonRpcProvider(RPC)
    const receipt = await provider.getTransactionReceipt(onchainHash)

    if (!receipt) {
      return NextResponse.json({ ok: false, error: 'Transaction not found on chain' }, { status: 404 })
    }

    if (receipt.status !== 1) {
      return NextResponse.json({ ok: false, error: 'Transaction failed on chain' }, { status: 400 })
    }

    // ===== STEP 3: Hitung jumlah WR dari amountUSDC =====
    const rawUSDC = parseDecimalToBigInt(String(amountUSDC), 6)
    const wrAmountRaw = rawUSDC * 200n * 10n ** 12n // 1 USDC = 200 WR, 18 - 6 = 12

    // ===== STEP 4: Simpan status pending =====
    const pending = await Topup.create({
      userAddress: userAddress.toLowerCase(),
      depositTxHash: normalizedDeposit,
      onchainHash: onchainHash.toLowerCase(),
      amountUSDC: Number(amountUSDC),
      amountWR: (Number(amountUSDC) * 200).toString(),
      status: 'pending',
    })

    // ===== STEP 5: Mint WR =====
    const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider)
    const wr = new ethers.Contract(WR_CONTRACT, WRABI as any, wallet)

    try {
      const mintTx = await wr.mint(userAddress, wrAmountRaw)
      const mintReceipt = await mintTx.wait(1)

      if (mintReceipt.status === 1) {
        pending.status = 'minted'
        // @ts-ignore
        pending.mintTxHash = mintTx.hash
        await pending.save()

        return NextResponse.json({
          ok: true,
          message: 'Minted WR successfully',
          depositTxHash: normalizedDeposit,
          onchainHash,
          mintTxHash: mintTx.hash,
          amountWR: (Number(amountUSDC) * 200).toString(),
          record: pending,
        })
      } else {
        pending.status = 'failed'
        // @ts-ignore
        pending.mintTxHash = mintTx.hash
        await pending.save()
        return NextResponse.json({ ok: false, error: 'Mint transaction failed' }, { status: 500 })
      }
    } catch (mintErr: any) {
      pending.status = 'failed'
      pending.error = mintErr?.message || String(mintErr)
      await pending.save()
      return NextResponse.json({ ok: false, error: 'Mint error: ' + mintErr.message }, { status: 500 })
    }
  } catch (err: any) {
    console.error('Error /api/topup:', err)
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
