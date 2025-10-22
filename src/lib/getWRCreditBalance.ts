// /lib/getWRCreditBalance.ts
import { ethers } from 'ethers'
import WRCreditABI from '@/abi/WRCredit.json'

// alamat kontrak WRCredit hasil deploy
const WRCREDIT_ADDRESS = process.env.NEXT_PUBLIC_WRCREDIT_ADDRESS as string

// RPC publik sesuai chain kamu, misalnya Sepolia, BSC, atau lainnya
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL as string

export async function getWRCreditBalance(walletAddress: string) {
  try {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(WRCREDIT_ADDRESS, WRCreditABI, provider)

    const balance = await contract.balanceOf(walletAddress)
    return Number(ethers.utils.formatUnits(balance, 18))
  } catch (err) {
    console.error('❌ Failed to fetch WRCredit balance:', err)
    return 0
  }
}
