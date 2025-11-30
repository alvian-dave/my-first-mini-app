'use client';

import { walletAuth } from '@/auth/wallet';
import { Button } from '@/components/ui/button';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useCallback, useState } from 'react';

export const AuthButton = () => {
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const { isInstalled } = useMiniKit();

  const onClick = useCallback(async () => {
    if (!isInstalled || isPending) return;

    setIsPending(true);
    setStatus('idle');

    try {
      await walletAuth();
      setStatus('success');
    } catch (error) {
      console.error('Wallet authentication error:', error);
      setStatus('failed');
    } finally {
      setIsPending(false);

      // reset status setelah 2 detik
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [isInstalled, isPending]);

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={onClick}
        disabled={isPending}
        size="lg"
        className="w-full"
      >
        {isPending ? 'Logging in…' : 'Login with World ID'}
      </Button>

      {status === 'success' && (
        <p className="text-sm text-green-500">Logged in</p>
      )}
      {status === 'failed' && (
        <p className="text-sm text-red-500">Failed to login</p>
      )}
    </div>
  );
};
