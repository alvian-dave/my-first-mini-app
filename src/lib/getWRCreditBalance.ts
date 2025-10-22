// /lib/getWRCreditBalance.ts
import { Contract, JsonRpcProvider, formatUnits } from 'ethers'
import WRCreditABI from '@/abi/WRCredit.json'

// Ambil dari .env
const WRCREDIT_ADDRESS = process.env.NEXT_PUBLIC_WRCREDIT_ADDRESS as string
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL as string

export async function getWRCreditBalance(walletAddress: string) {
  try {
    // Buat provider RPC publik
    const provider = new JsonRpcProvider(RPC_URL)

    // Inisialisasi kontrak ERC20
    const contract = new Contract(WRCREDIT_ADDRESS, WRCreditABI, provider)

    // Panggil fungsi balanceOf
    const balance = await contract.balanceOf(walletAddress)

    // Format dari BigInt ke angka desimal (18 desimal)
    return Number(formatUnits(balance, 18))
  } catch (err) {
    console.error('❌ Failed to fetch WRCredit balance:', err)
    return 0
  }
}
