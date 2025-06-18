'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  createPublicClient,
  http,
  parseAbi,
  encodeFunctionData,
  formatEther,
} from 'viem';

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
  const { sendTransaction } = useMiniKit();

  const address = session?.user?.walletAddress as `0x${string}` | undefined;
  const [pending, setPending] = useState('0');
  const [loading, setLoading] = useState(false);

  const handleClaim = useCallback(async () => {
    if (!sendTransaction || !address) return;

    try {
      setLoading(true);

      const data = encodeFunctionData({
        abi,
        functionName: 'claimWorldReward',
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { commandPayload, finalPayload } = await sendTransaction({
        to: contractAddress,
        data,
      });

      console.log('✅ Claim transaction sent');
    } catch (err) {
      console.error('❌ Claim failed:', err);
    } finally {
      setLoading(false);
    }
  }, [sendTransaction, address]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!address) return;

    fetch('/api/auto-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.shouldClaim) {
          handleClaim();
        }
      })
      .catch(console.error);
  }, [address]);

  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
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
    }, 1000);

    return () => clearInterval(interval);
  }, [address]);

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
