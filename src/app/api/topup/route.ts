import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { TopupReference } from '@/models/TopupReference'
import { ethers } from 'ethers'

// Contoh: WR token contract ABI & address
import WR_ABI from '@/abi/WRCredit.json'
const WR_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WR_CONTRACT!
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!

export async function GET() {
  try {
    await dbConnect()

    // Ambil semua top-up sukses tapi belum dikirim
    const pendingTopups = await TopupReference.find({ status: 'success', isSent: { $ne: true } })

    if (pendingTopups.length === 0) {
      return NextResponse.json({ message: 'No pending WR to send.' })
    }

    // Setup provider & wallet (gunakan private key server)
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider)
    const wrContract = new ethers.Contract(WR_CONTRACT_ADDRESS, WR_ABI, wallet)

    for (const topup of pendingTopups) {
      try {
        const userAddress = topup.userAddress
        const wrAmount = ethers.parseUnits(topup.wrAmount, 18)
        
        const tx = await wrContract.transfer(userAddress, wrAmount)
        await tx.wait()

        // Tandai sudah dikirim
        topup.isSent = true
        await topup.save()
        console.log(`Sent ${topup.wrAmount} WR to ${userAddress}`)
      } catch (err) {
        console.error(`Failed to send WR to ${topup.userAddress}:`, err)
      }
    }

    return NextResponse.json({ message: 'Cron job completed.' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
