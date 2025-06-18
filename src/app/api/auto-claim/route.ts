// pages/api/auto-claim.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { createPublicClient, http, parseAbi } from 'viem';

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;

const abi = parseAbi([
  'function pendingWorldReward(address) view returns (uint256)',
]);

const client = createPublicClient({
  transport: http(rpcUrl),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Missing address' });

  try {
    const pending = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi,
      functionName: 'pendingWorldReward',
      args: [address],
    });

    const reward = BigInt(pending.toString());

    if (reward > 0n) {
      console.log(`[SKIP] ${address} already claimed.`);
      return res.status(200).json({ alreadyClaimed: true });
    }

    console.log(`[AUTO] ${address} belum pernah claim → lanjut claim dari frontend`);
    return res.status(200).json({ shouldClaim: true });
  } catch (err) {
    console.error('[ERROR] auto-claim check:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
