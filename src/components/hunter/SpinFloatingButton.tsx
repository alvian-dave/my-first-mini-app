"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import SpinModal from "./modals/SpinModal";

const SpinFloatingButton = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState({
    canFreeSpin: false,
    timeLeft: "00:00:00",
    lastFreeSpinAt: null as string | null,
  });

  // 1. Fetch Status Awal dari API
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/spin/execute", { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setStatus((prev) => ({
          ...prev,
          lastFreeSpinAt: data.lastFreeSpinAt,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch spin status");
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [isModalOpen]); // Refresh status tiap kali modal ditutup (siapa tahu user abis spin)

  // 2. Logika Real-time Countdown 24 Jam
  useEffect(() => {
    const timer = setInterval(() => {
      if (!status.lastFreeSpinAt) {
        setStatus((prev) => ({ ...prev, canFreeSpin: true, timeLeft: "READY" }));
        return;
      }

      const lastSpin = new Date(status.lastFreeSpinAt).getTime();
      const nextSpin = lastSpin + 24 * 60 * 60 * 1000;
      const now = new Date().getTime();
      const diff = nextSpin - now;

      if (diff <= 0) {
        setStatus((prev) => ({ ...prev, canFreeSpin: true, timeLeft: "READY" }));
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setStatus((prev) => ({
          ...prev,
          canFreeSpin: false,
          timeLeft: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status.lastFreeSpinAt]);

  if (!isVisible) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: status.canFreeSpin ? [0, -10, 0] : 0,
          }}
          transition={{ y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
          className="fixed bottom-24 right-8 z-[999] cursor-grab active:cursor-grabbing"
        >
          <div className="relative flex items-center justify-center w-28 h-28">
            {/* Tombol Tutup */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
              className="absolute -top-1 -right-1 bg-black border border-cyan-500 text-white rounded-full p-1 z-[1010] hover:bg-red-500 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.5)]"
            >
              <X size={12} />
            </button>

            {/* Pointer */}
            <div className="absolute -top-1 z-[1005] drop-shadow-[0_0_8px_#22d3ee]">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M12 24L2 4H22L12 24Z" fill="#22d3ee" />
              </svg>
            </div>

            {/* Putaran Roda Luar */}
            <motion.div
              animate={{ rotate: status.canFreeSpin ? 360 : 0 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className={`absolute inset-0 rounded-full border-2 transition-colors duration-500
                ${status.canFreeSpin 
                  ? "border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.4)]" 
                  : "border-slate-800 shadow-none"}`}
              style={{
                background: status.canFreeSpin 
                  ? "conic-gradient(from 0deg, #0891b2 0deg 30deg, transparent 30deg 60deg, #0891b2 60deg 90deg, transparent 90deg)"
                  : "transparent"
              }}
            >
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`absolute top-1/2 left-1/2 w-full h-[1px] origin-center transition-colors ${status.canFreeSpin ? "bg-cyan-500/30" : "bg-slate-800"}`}
                  style={{ transform: `translate(-50%, -50%) rotate(${i * 60}deg)` }}
                />
              ))}
            </motion.div>

            {/* Center Button (Clickable) */}
            <div
              onClick={() => setIsModalOpen(true)}
              className={`relative z-[1000] w-20 h-20 rounded-full flex flex-col items-center justify-center border-2 transition-all cursor-pointer active:scale-90
              ${status.canFreeSpin
                  ? "bg-black border-cyan-400 shadow-[inset_0_0_20px_rgba(34,211,238,0.5)]"
                  : "bg-slate-950 border-slate-800 shadow-none opacity-80"}`}
            >
              {status.canFreeSpin ? (
                <span className="text-[11px] font-black text-cyan-400 text-center leading-tight tracking-tighter uppercase drop-shadow-[0_0_5px_#22d3ee] animate-pulse">
                  FREE<br />SPIN
                </span>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-[7px] text-slate-500 font-black uppercase mb-0.5 tracking-[0.2em]">Restoring</span>
                  <span className="text-[11px] font-mono font-black text-slate-400 tracking-tighter italic">
                    {status.timeLeft}
                  </span>
                </div>
              )}
              
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <SpinModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default SpinFloatingButton;