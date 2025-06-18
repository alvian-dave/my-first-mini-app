// app/api/auto-claim/route.ts

import { NextRequest } from 'next/server';
import { createPublicClient, http, parseAbi } from 'viem';

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS! as `0x${string}`;
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
      address: contractAddress,
      abi,
      functionName: 'pendingWorldReward',
      args: [address],
    });

    const reward = BigInt(pending.toString());

    if (reward > BigInt(0)) {
      console.log(`[AUTO] ${address} → pending reward ${reward} → lanjut claim`);
      return Response.json({ shouldClaim: true });
    }

    console.log(`[SKIP] ${address} → pending reward 0 → tidak perlu claim`);
    return Response.json({ shouldClaim: false });
  } catch (err) {
    console.error('[ERROR] auto-claim check:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
    });
  }
}