import { ethers } from "ethers"
import { Campaign } from "@/models/Campaign"

/**
 * Rescue remaining WR from escrow to promoter.
 * - Expects campaign.remainingWR stored in smallest unit (wei) as string.
 * - Returns tx receipt-like object { txHash, amountRescued }
 */
export async function rescueCampaignFunds(campaign: typeof Campaign.prototype) {
  const RPC = process.env.NEXT_PUBLIC_RPC_URL!
  const ESCROW_CONTRACT = process.env.NEXT_PUBLIC_WR_ESCROW!
  const WR_TOKEN = process.env.NEXT_PUBLIC_WR_CONTRACT!
  const OWNER_PRIVATE_KEY = process.env.PRIVATE_KEY!

  if (!campaign) throw new Error("Campaign required")
  const remainingStr = campaign.remainingWR || "0"
  const remaining = BigInt(remainingStr)
  if (remaining <= 0n) {
    return { rescued: false, reason: "no_remaining" }
  }

  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider)

  const escrow = new ethers.Contract(
    ESCROW_CONTRACT,
    [
      "function rescueERC20(address token, address to, uint256 amount) public",
    ],
    wallet
  )

  // perform on-chain rescue
  const promoterAddress = campaign.promoterAddress
  if (!promoterAddress) throw new Error("Campaign.promoterAddress missing")

  const tx = await escrow.rescueERC20(WR_TOKEN, promoterAddress, remaining)
  const receipt = await tx.wait()

  // log transaction in campaign
  campaign.transactions = campaign.transactions || []
  campaign.transactions.push({
    type: "rescue",
    txHash: receipt.hash,
    to: promoterAddress,
    amount: remaining.toString(),
    timestamp: new Date(),
  })

  // update remaining and status
  campaign.remainingWR = "0"
  campaign.status = "finished"
  campaign.lastRescueTx = receipt.hash
  await campaign.save()

  return {
    rescued: true,
    txHash: receipt.hash,
    amountRescued: remaining.toString(),
    campaign,
  }
}