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
    <div className="flex flex-col items-center gap-4 w-full sm:w-auto">
      <Button
        onClick={onClick}
        disabled={isPending}
        size="lg"
        className={`
          relative overflow-hidden w-full sm:min-w-[200px] px-8 py-6 text-lg font-bold tracking-wide text-white
          bg-gradient-to-r from-blue-600 to-green-600
          border border-blue-400/50 rounded-xl
          shadow-[0_0_15px_rgba(59,130,246,0.5)]
          transition-all duration-300 ease-out
          
          hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]
          hover:scale-105 hover:brightness-110 hover:-translate-y-1
          
          active:scale-95 active:shadow-none
          
          disabled:opacity-70 disabled:cursor-not-allowed disabled:grayscale
        `}
      >
        {/* Lapisan overlay agar teks lebih terbaca jika background terlalu terang */}
        <span className="relative z-10 drop-shadow-md">
          {isPending ? 'Logging in…' : 'Login with World ID'}
        </span>
        
        {/* Efek kilau (sheen) halus di background */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </Button>

      {status === 'success' && (
        <p className="text-sm font-medium text-green-400 animate-in fade-in slide-in-from-top-2">
          Successfully Logged In
        </p>
      )}
      {status === 'failed' && (
        <p className="text-sm font-medium text-red-400 animate-in fade-in slide-in-from-top-2">
          Failed to login
        </p>
      )}
    </div>
  );
};