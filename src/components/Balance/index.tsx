'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { createPublicClient, http, defineChain } from 'viem';
import tokenABI from '@/abi/tokenABI.json';

// ⬇️ Langsung definisikan World Chain di sini
const worldchain = defineChain({
  id: 480,
  name: 'World Chain',
  network: 'worldchain',
  nativeCurrency: {
    name: 'Worldcoin',
    symbol: 'WLD',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://worldchain-mainnet.g.alchemy.com/public'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Worldscan',
      url: 'https://worldscan.org',
    },
  },
});

const tokenAddress = '0x020dC518227Dfa84237eB3c2C32cc9c8D70d92BE';
const tokenDecimals = 18;

export const Balance = () => {
  const { data: session } = useSession();
  const [balance, setBalance] = useState('0');

  const client = createPublicClient({
    chain: worldchain,
    transport: http(),
  });

  useEffect(() => {
    const fetchBalance = async () => {
      const walletAddress = session?.user?.walletAddress;
      if (!walletAddress) return;

      try {
        const raw = await client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: tokenABI,
          functionName: 'balanceOf',
          args: [walletAddress as `0x${string}`],
        });

        const formatted = Number(raw) / 10 ** tokenDecimals;
        setBalance(formatted.toString());
      } catch (err) {
        console.error('Gagal ambil balance:', err);
        setBalance('0');
      }
    };

    fetchBalance();
  }, [session?.user?.walletAddress]);

  return (
    <div className="text-white text-sm font-normal">
     {balance} WRC
    </div>
  );
};