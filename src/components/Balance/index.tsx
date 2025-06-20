'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useSession } from 'next-auth/react';
import tokenABI from '@/abi/tokenABI.json';

const tokenAddress = '0x020dC518227Dfa84237eB3c2C32cc9c8D70d92BE';
const tokenDecimals = 18;

export const Balance = () => {
  const { data: session } = useSession();
  const [balance, setBalance] = useState('0');

  useEffect(() => {
    const fetchBalance = async () => {
      const walletAddress = session?.user?.walletAddress;
      if (!walletAddress) return;

      try {
        const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const contract = new ethers.Contract(tokenAddress, tokenABI, provider);

        const raw = await contract.balanceOf(walletAddress);
        const formatted = ethers.utils.formatUnits(raw, tokenDecimals);
        setBalance(formatted);
      } catch (err) {
        console.error('Gagal ambil balance:', err);
        setBalance('0');
      }
    };

    fetchBalance();
  }, [session?.user?.walletAddress]);

  return (
    <div className="text-white text-lg font-bold">
      Balance: {balance} WRC
    </div>
  );
};