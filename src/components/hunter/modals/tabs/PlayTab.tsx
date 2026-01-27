"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { MiniKit, ResponseEvent, VerificationLevel } from "@worldcoin/minikit-js";

interface PlayTabProps {
  initialData: {
    availableSpins: number;
    accumulatedWR: number;
    lastFreeSpinAt: string | null;
  };
  onUpdate?: (data: any) => void;
}

const PlayTab = ({ initialData, onUpdate }: PlayTabProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinData, setSpinData] = useState(initialData);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const MIN_CLAIM_AMOUNT = 100;
  const segments = [0.05, 1, 50, 0.07, 3, 100, 0.1, 5, 300, 10, 20, 500];
  const segmentAngle = 360 / segments.length;

  // --- World ID Integration ---
  useEffect(() => {
    if (!MiniKit.isInstalled()) return;

    MiniKit.subscribe(ResponseEvent.MiniAppVerifyAction, async (payload) => {
      if (payload.status === "error") {
        toast.error("Verification failed or cancelled");
        setIsClaiming(false);
        return;
      }

      // 3. KIRIM KE API CLAIM (Backend yang tadi kita bahas)
      try {
        const res = await fetch("/api/spin/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload }),
        });

        const data = await res.json();

        if (data.ok) {
          toast.success(`Claim Success! TX: ${data.txHash.slice(0, 6)}...`);
          // Update local balance jadi 0 setelah berhasil claim
          const updated = { ...spinData, accumulatedWR: 0 };
          setSpinData(updated);
          if (onUpdate) onUpdate(updated);
        } else {
          toast.error(data.error || "Claim failed at server");
        }
      } catch (err) {
        toast.error("Network error during claim");
      } finally {
        setIsClaiming(false);
      }
    });

    return () => MiniKit.unsubscribe(ResponseEvent.MiniAppVerifyAction);
  }, [spinData, onUpdate]);

  const handleClaim = useCallback(() => {
    if (spinData.accumulatedWR < MIN_CLAIM_AMOUNT) {
      toast.error(`Minimum claim is ${MIN_CLAIM_AMOUNT} WR`);
      return;
    }
    
    setIsClaiming(true);

    if (!MiniKit.isInstalled()) {
      toast.error("Please open this app inside World App");
      setIsClaiming(false);
      return;
    }

    // 1. TRIGGER WORLD ID
    MiniKit.commands.verify({
      action: "claim-reward",
      verification_level: VerificationLevel.Device,
    });
  }, [spinData.accumulatedWR]);

  // --- Logic Timer ---
  useEffect(() => {
    const timer = setInterval(() => {
      if (!spinData.lastFreeSpinAt) {
        setTimeLeft("READY");
        return;
      }
      const lastSpin = new Date(spinData.lastFreeSpinAt).getTime();
      const nextSpin = lastSpin + 24 * 60 * 60 * 1000;
      const now = new Date().getTime();
      const diff = nextSpin - now;

      if (diff <= 0) setTimeLeft("READY");
      else {
        const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
        setTimeLeft(`${h}:${m}:${s}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [spinData.lastFreeSpinAt]);

  // --- Logic Spin ---
  const handleSpin = async () => {
    if (isSpinning) return;
    const isFreeEligible = timeLeft === "READY";
    if (!isFreeEligible && spinData.availableSpins <= 0) {
      toast.error("Insufficient Energy");
      return;
    }

    setIsSpinning(true);
    try {
      const res = await fetch("/api/spin/execute", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const winAmount = data.reward;
      let targetIndex = segments.findIndex(v => v === winAmount);
      if (targetIndex === -1) {
        targetIndex = segments.reduce((prev, curr, idx) => 
          Math.abs(curr - winAmount) < Math.abs(segments[prev] - winAmount) ? idx : prev, 0);
      }

      const extraDegrees = (segments.length - targetIndex) * segmentAngle;
      const newRotation = rotation + 1800 + extraDegrees - (rotation % 360);
      setRotation(newRotation);

      setTimeout(() => {
        setIsSpinning(false);
        const updated = {
          availableSpins: data.availableSpins,
          accumulatedWR: data.accumulatedWR,
          lastFreeSpinAt: data.lastFreeSpinAt
        };
        setSpinData(updated);
        if (onUpdate) onUpdate(updated);
        toast.success(`Neural Sync: +${winAmount} WR`);
      }, 4000);
    } catch (err: any) {
      toast.error(err.message || "Sync Error");
      setIsSpinning(false);
    }
  };

  const canSpin = timeLeft === "READY" || spinData.availableSpins > 0;
  const canClaim = spinData.accumulatedWR >= MIN_CLAIM_AMOUNT;

  return (
    <div className="flex flex-col items-center gap-8 py-2">
      {/* WHEEL UI */}
      <div className="relative w-72 h-72 flex items-center justify-center">
        <div className="absolute -top-4 z-40 text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]">
           <svg width="32" height="32" viewBox="0 0 24 24">
             <path d="M12 24L2 2H22L12 24Z" fill="currentColor"/>
           </svg>
        </div>
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.15, 0, 0.15, 1] }}
          className="w-full h-full rounded-full border-[8px] border-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative overflow-hidden"
          style={{
            background: `conic-gradient(from 0deg, #0891b2 0deg 30deg, #020617 30deg 60deg, #0891b2 60deg 90deg, #020617 90deg 120deg, #0891b2 120deg 150deg, #020617 150deg 180deg, #0891b2 180deg 210deg, #020617 210deg 240deg, #0891b2 240deg 270deg, #020617 270deg 300deg, #0891b2 300deg 330deg, #020617 330deg 360deg)`
          }}
        >
          {segments.map((val, i) => (
            <div key={i} className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full" style={{ transform: `rotate(${i * segmentAngle}deg)` }}>
              <span className="absolute top-7 left-1/2 -translate-x-1/2 text-[10px] font-black text-white italic" style={{ transform: `rotate(15deg)`, transformOrigin: 'top center' }}>{val}</span>
            </div>
          ))}
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 bg-[#020617] border-4 border-cyan-500 rounded-full shadow-[0_0_20px_#0891b2] z-30 flex items-center justify-center">
               <Zap size={20} className={isSpinning ? "text-cyan-400 animate-pulse" : "text-slate-600"} />
            </div>
        </div>
      </div>

      {/* SPIN BUTTON */}
      <div className="w-full space-y-4">
        <button
          onClick={handleSpin}
          disabled={isSpinning || !canSpin}
          className={`w-full py-5 rounded-2xl font-black italic tracking-widest transition-all flex flex-col items-center justify-center
            ${canSpin && !isSpinning 
              ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]" 
              : "bg-slate-900 text-slate-600 border border-white/5"}`}
        >
          {isSpinning ? <Loader2 className="animate-spin" /> : (
            <>
              <span className="text-sm uppercase tracking-tighter font-black">{canSpin ? "Initiate Neural Spin" : "Cooldown Active"}</span>
              <span className="text-[9px] opacity-70">
                {spinData.availableSpins > 0 ? `${spinData.availableSpins} Charges Remaining` : `Sync in ${timeLeft}`}
              </span>
            </>
          )}
        </button>
      </div>

      {/* CLAIM SECTION */}
      <div className="w-full bg-slate-950/80 border border-white/5 p-5 rounded-3xl flex flex-col gap-3 shadow-2xl">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Available Rewards</p>
            <h3 className="text-3xl font-black text-white italic tracking-tighter">
              {spinData.accumulatedWR.toFixed(3)} <span className="text-cyan-500 text-sm">WR</span>
            </h3>
          </div>
          <button 
            onClick={handleClaim}
            disabled={!canClaim || isClaiming}
            className={`h-12 px-6 rounded-2xl text-[11px] font-black uppercase tracking-tighter transition-all active:scale-95 flex items-center justify-center
              ${canClaim 
                ? "bg-cyan-500 text-black hover:bg-cyan-400" 
                : "bg-cyan-500/10 text-cyan-500/30 border border-cyan-500/20 cursor-not-allowed"}`}
          >
            {isClaiming ? <Loader2 className="animate-spin w-4 h-4" /> : "Claim"}
          </button>
        </div>
        
        <p className="text-[10px] text-center font-bold italic tracking-wider text-slate-500 uppercase">
          Minimum claim 100 WR
        </p>
      </div>
    </div>
  );
};

export default PlayTab;