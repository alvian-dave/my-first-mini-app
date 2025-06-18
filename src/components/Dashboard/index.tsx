'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  createPublicClient,
  http,
  parseAbi,
  formatEther,
} from 'viem';
import { MiniKit } from '@worldcoin/minikit-js';

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS! as `0x${string}`;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;

const abi = parseAbi([
  'function claimWorldReward()',
  'function pendingWorldReward(address) view returns (uint256)',
]);

const client = createPublicClient({
  transport: http(rpcUrl),
});

export const Dashboard = () => {
  const { data: session } = useSession();
  const address = session?.user?.walletAddress as `0x${string}` | undefined;

  const [pending, setPending] = useState('0');
  const [loading, setLoading] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);

  const fetchPendingReward = useCallback(() => {
    if (!address) return;

    client.readContract({
      address: contractAddress,
      abi,
      functionName: 'pendingWorldReward',
      args: [address],
    })
      .then((res) => {
        const formatted = formatEther(res as bigint);
        setPending(formatted);
      })
      .catch(console.error);
  }, [address]);

  useEffect(() => {
    if (!address || hasClaimed) return;

    fetch('/api/auto-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
      .then(res => res.json())
      .then(async (data) => {
        if (data.shouldClaim) {
          await handleClaim();
        }
      })
      .catch(console.error);
  }, [address, hasClaimed]);

  useEffect(() => {
    if (!address) return;

    const interval = setInterval(fetchPendingReward, 1000);
    return () => clearInterval(interval);
  }, [fetchPendingReward]);

  const handleClaim = async () => {
    if (!address) return;
    setLoading(true);

    try {
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: contractAddress,
            abi,
            functionName: 'claimWorldReward',
          },
        ],
        formatPayload: true,
      });

      console.log('✅ Sent via Worldcoin relayer', finalPayload);
      setHasClaimed(true);
    } catch (err) {
      console.error('❌ Transaction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm rounded-2xl shadow-md">
        <CardContent className="p-6 text-center space-y-5">
          <h2 className="text-xl font-semibold">Available to Claim</h2>
          <p className="text-3xl font-bold text-green-600">{pending} WRC</p>

          <Button
            onClick={handleClaim}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? 'Claiming...' : 'Claim Now'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};