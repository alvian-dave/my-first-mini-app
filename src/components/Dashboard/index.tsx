'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  createPublicClient,
  http,
  parseAbi,
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
  const address = session?.user?.walletAddress;

  const [pending, setPending] = useState('0');
  const [loading, setLoading] = useState(false);

  // Realtime fetch reward
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      client.readContract({
        address: contractAddress,
        abi,
        functionName: 'pendingWorldReward',
        args: [address as `0x${string}`],
      })
        .then((res) => {
          const formatted = formatEther(res as bigint);
          setPending(formatted);
        })
        .catch(console.error);
    }, 1000);

    return () => clearInterval(interval);
  }, [address]);

  // Otomatis claim saat login pertama
  useEffect(() => {
    if (!address) return;

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
  }, [address]);

  const handleClaim = async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/claim-relay', {
        method: 'POST',
        body: JSON.stringify({ address }),
      });

      const tx = await res.json();
      console.log('✅ Claim TX result:', tx);

      if (tx.status === 'success') {
        alert('✅ Claim berhasil!');
        setPending('0');
      } else {
        alert('⚠️ Gagal claim. Mungkin sedang diproses.');
      }
    } catch (err) {
      console.error('❌ Claim failed:', err);
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