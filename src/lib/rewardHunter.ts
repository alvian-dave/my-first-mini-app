import { ethers } from "ethers"

export async function rewardHunter(hunterAddress: string, campaign: any) {
  const RPC = process.env.NEXT_PUBLIC_RPC_URL!
  const ESCROW_CONTRACT = process.env.NEXT_PUBLIC_WR_ESCROW!
  const WR_TOKEN = process.env.NEXT_PUBLIC_WR_CONTRACT!
  const OWNER_PRIVATE_KEY = process.env.PRIVATE_KEY!

  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider)

    // ambil decimals token secara dinamis (fallback ke 18 kalau gagal)
  let decimals = 18
  try {
    const tokenContract = new ethers.Contract(
      WR_TOKEN,
      ["function decimals() view returns (uint8)"],
      provider
    )
    decimals = Number(await tokenContract.decimals())
  } catch (e) {
    // kalau gagal, biarkan default 18
    console.warn("Failed to read token decimals, defaulting to 18:", e)
  }

  // campaign.reward diasumsikan berupa jumlah token (mis. "10" atau 10)
  // konversi ke smallest unit menggunakan parseUnits
  // parseUnits mengembalikan BigInt-like BigNumber di ethers v6
  const rewardBN = ethers.parseUnits(String(campaign.reward), decimals) // BigInt (ethers v6 returns bigint)
  // jika kamu butuh BigInt explicitly:
  const reward = BigInt(rewardBN.toString())

  const escrow = new ethers.Contract(
    ESCROW_CONTRACT,
    [
      "function payReward(address token, address to, uint256 amount) public",
      "function rescueERC20(address token, address to, uint256 amount) public",
    ],
    wallet
  )

  let remaining = BigInt(campaign.remainingWR)

  // =====================
  // 1️⃣ Bayar hunter penuh
  // =====================
  if (remaining > 0n) {
    const tx = await escrow.payReward(WR_TOKEN, hunterAddress, reward)
    const receipt = await tx.wait()

    campaign.transactions = campaign.transactions || []
    campaign.transactions.push({
      type: "reward",
      txHash: receipt.hash,
      to: hunterAddress,
      amount: reward.toString(),
      timestamp: new Date(),
    })

    remaining -= reward
    campaign.remainingWR = remaining > 0n ? remaining.toString() : "0"
  }

  // =========================================
  // 2️⃣ Rescue sisa WR ke promoter jika kurang
  // =========================================
  if (remaining < reward && remaining > 0n) {
    const promoter = campaign.promoterAddress
    const tx = await escrow.rescueERC20(WR_TOKEN, promoter, remaining)
    const receipt = await tx.wait()

    campaign.transactions.push({
      type: "rescue",
      txHash: receipt.hash,
      to: promoter,
      amount: remaining.toString(),
      timestamp: new Date(),
    })

    campaign.remainingWR = "0"
  }

  // ===========================
  // 3️⃣ Tandai campaign selesai
  // ===========================
  if (BigInt(campaign.remainingWR) === 0n) {
    campaign.status = "finished"
  }

  await campaign.save()
}
