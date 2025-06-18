'use client';

import TestContractABI from '@/abi/TestContract.json';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react';
import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { worldchain } from 'viem/chains';

export const Transaction = () => {
  const contractAddress = '0x341029eA2F41f22DADfFf0f3Ef903b54a5805C59';
  const [buttonState, setButtonState] = useState<'pending' | 'success' | 'failed' | undefined>();
  const [transactionId, setTransactionId] = useState<string>('');
  const [isHidden, setIsHidden] = useState(false); // ← kontrol tampilan

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

  useEffect(() => {
    if (transactionId && !isConfirming) {
      if (isConfirmed) {
        console.log('Transaction confirmed!');
        setButtonState('success');
        setIsHidden(true); // ← sembunyikan setelah sukses
      } else if (isError) {
        console.error('Transaction failed:', error);
        setButtonState('failed');
      }

      setTimeout(() => {
        setButtonState(undefined);
      }, 3000);
    }
  }, [transactionId, isConfirming, isConfirmed, isError, error]);

  const onClickGetToken = async () => {
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

  if (isHidden) return null; // ← tidak render komponen jika sukses

  return (
    <div className="grid w-full gap-4">
      <p className="text-lg font-semibold">Transaction</p>
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
          onClick={onClickGetToken}
          disabled={buttonState === 'pending'}
          size="lg"
          variant="primary"
          className="w-full"
        >
          Get Token
        </Button>
      </LiveFeedback>
    </div>
  );
};
