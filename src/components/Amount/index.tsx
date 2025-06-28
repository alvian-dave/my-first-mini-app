'use client';

import TestContractABI from '@/abi/TestContract.json';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useSession } from 'next-auth/react';
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react';
import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { worldchain } from 'viem/chains';
import { useSpring, animated } from '@react-spring/web';
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

  const spring = useSpring({
    from: { number: 0 },
    to: { number: parseFloat(formatEther(availableReward)) },
    config: { tension: 120, friction: 14 },
  });

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

    fetchReward();
    const interval = setInterval(fetchReward, 1000);
    return () => clearInterval(interval);
  }, [session?.user.walletAddress]);

  useEffect(() => {
    if (transactionId && !isConfirming) {
      if (isConfirmed) {
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
        setTransactionId(finalPayload.transaction_id);
      } else {
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
      <div className="bg-white rounded-2xl shadow-md p-6 space-y-6 w-full max-w-md mx-auto">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">Available to claim:</p>
          <div className="h-[48px] flex items-center justify-center font-mono text-3xl font-bold text-black">
            <animated.span style={{ display: 'inline-block', minWidth: '7ch' }}>
              {spring.number.to((n) => `${n.toFixed(6)}`)}
            </animated.span>
          </div>
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
            {availableReward > 0n ? 'Claim' : 'Initial Reward'}
          </Button>
        </LiveFeedback>
      </div>
    </div>
  );
};