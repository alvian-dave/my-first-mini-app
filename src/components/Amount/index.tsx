'use client';

import TestContractABI from '@/abi/TestContract.json';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useSession } from 'next-auth/react';
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react';
import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { worldchain } from 'viem/chains';
import { formatEther } from 'viem/utils';

export const Amount = () => {
  const contractAddress = '0x341029eA2F41f22DADfFf0f3Ef903b54a5805C59';
  const { data: session } = useSession();
  const [buttonState, setButtonState] = useState<'pending' | 'success' | 'failed' | undefined>();
  const [transactionId, setTransactionId] = useState<string>('');
  const [availableReward, setAvailableReward] = useState<bigint>(0n);

  const client = createPublicClient({
    chain: worldchain,
    transport: http('https://worldchain-mainnet.g.alchemy.com/public'),
  });

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError,
    error,
  } = useWaitForTransactionReceipt({
    client,
    appConfig: {
      app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
    },
    transactionId,
  });

  // Auto fetch reward setiap detik
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!session?.user.walletAddress) return;

    const fetchReward = async () => {
      try {
        const reward = await client.readContract({
          address: contractAddress,
          abi: TestContractABI,
          functionName: 'pendingWorldReward',
          args: [session.user.walletAddress],
        });
        setAvailableReward(reward as bigint);
      } catch (e) {
        console.error('Gagal ambil pending reward:', e);
      }
    };

    fetchReward(); // pertama kali
    const interval = setInterval(fetchReward, 1000); // tiap detik
    return () => clearInterval(interval);
  }, [session?.user.walletAddress]);

  // Update status transaksi setelah dikirim
  useEffect(() => {
    if (transactionId && !isConfirming) {
      if (isConfirmed) {
        console.log('Transaction confirmed!');
        setButtonState('success');
      } else if (isError) {
        console.error('Transaction failed:', error);
        setButtonState('failed');
      }

      setTimeout(() => {
        setButtonState(undefined);
      }, 3000);
    }
  }, [transactionId, isConfirming, isConfirmed, isError, error]);

  const onClickClaim = async () => {
    setTransactionId('');
    setButtonState('pending');

    try {
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: contractAddress,
            abi: TestContractABI,
            functionName: 'claimWorldReward',
            args: [],
          },
        ],
      });

      if (finalPayload.status === 'success') {
        console.log('Transaction submitted:', finalPayload.transaction_id);
        setTransactionId(finalPayload.transaction_id);
      } else {
        console.error('Transaction submission failed:', finalPayload);
        setButtonState('failed');
      }
    } catch (err) {
      console.error('Error sending transaction:', err);
      setButtonState('failed');
    }

    setTimeout(() => {
      setButtonState(undefined);
    }, 3000);
  };

  return (
  <div className="w-full px-4">
    <div className="bg-white rounded-2xl shadow-md p-4 space-y-2">
      <p className="text-sm text-gray-500">Available to claim:</p>
      <p className="text-2xl font-bold text-black">
        {formatEther(availableReward)} WRC
      </p>
    </div>

      <LiveFeedback
        label={{
          failed: 'Transaction failed',
          pending: 'Transaction pending',
          success: 'Transaction successful',
        }}
        state={buttonState}
        className="w-full"
      >
        <Button
          onClick={onClickClaim}
          disabled={buttonState === 'pending'}
          size="lg"
          variant="primary"
          className="w-full"
        >
          {availableReward > 0n ? 'Initial Reward' : 'Claim'}
        </Button>
      </LiveFeedback>
    </div>
  );
};
