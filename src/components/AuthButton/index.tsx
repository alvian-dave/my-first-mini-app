'use client';

import { walletAuth } from '@/auth/wallet';
import { Button } from '@/components/ui/button';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useCallback, useState } from 'react';
import { Loader2, Fingerprint, ChevronRight } from 'lucide-react';

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
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [isInstalled, isPending]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[280px]">
      <Button
        onClick={onClick}
        disabled={isPending}
        className={`
          relative overflow-hidden w-full h-16 rounded-[20px] transition-all duration-300
          border border-white/10 bg-[#0f172a] shadow-2xl active:scale-95
          ${isPending ? 'opacity-80' : 'hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]'}
        `}
      >
        {/* Inner Glow Effect */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]" />
        
        {/* Animated Scanning Line */}
        {!isPending && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent h-[50%] w-full -translate-y-full animate-[scan_3s_linear_infinite] pointer-events-none" />
        )}

        <div className="relative z-10 flex items-center justify-between w-full px-2">
          <div className={`p-2 rounded-xl transition-colors duration-500 ${isPending ? 'bg-slate-800' : 'bg-emerald-500/10'}`}>
            {isPending ? (
              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
            ) : (
              <Fingerprint className="w-5 h-5 text-emerald-400" />
            )}
          </div>

          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white italic">
            {isPending ? 'Verifying...' : 'Login World ID'}
          </span>

          <div className="p-1">
             <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isPending ? 'opacity-0' : 'group-hover:translate-x-1 text-slate-500'}`} />
          </div>
        </div>
      </Button>

      {/* Status Messages */}
      <div className="h-4">
        {status === 'success' && (
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
            Identity Verified
          </p>
        )}
        {status === 'failed' && (
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
            Verification Failed
          </p>
        )}
      </div>

      <style jsx global>{`
        @keyframes scan {
          from { transform: translateY(-100%); }
          to { transform: translateY(200%); }
        }
      `}</style>
    </div>
  );
};