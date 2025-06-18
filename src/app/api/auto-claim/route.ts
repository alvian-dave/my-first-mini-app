// app/api/auto-claim/route.ts (Next.js 13+ App Router style)

import { NextRequest } from 'next/server';
import { createPublicClient, http, parseAbi } from 'viem';

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;

const abi = parseAbi([
  'function pendingWorldReward(address) view returns (uint256)',
]);

const client = createPublicClient({
  transport: http(rpcUrl),
});

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!address) {
      return new Response(JSON.stringify({ error: 'Missing address' }), {
        status: 400,
      });
    }

    const pending = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi,
      functionName: 'pendingWorldReward',
      args: [address],
    });

    const reward = BigInt(pending.toString());

    if (reward > 0n) {
      console.log(`[SKIP] ${address} already claimed.`);
      return Response.json({ alreadyClaimed: true });
    }

    console.log(`[AUTO] ${address} belum pernah claim → lanjut claim dari frontend`);
    return Response.json({ shouldClaim: true });
  } catch (err) {
    console.error('[ERROR] auto-claim check:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
    });
  }
}
