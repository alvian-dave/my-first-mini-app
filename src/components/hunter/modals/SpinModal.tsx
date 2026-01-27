"use client";

import React, { useState, useEffect } from "react";
import { X, Disc, ShoppingCart, Loader2 } from "lucide-react";
import PlayTab from "./tabs/PlayTab";
import BuyTab from "./tabs/BuyTab";

interface SpinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SpinModal = ({ isOpen, onClose }: SpinModalProps) => {
  const [tab, setTab] = useState<"play" | "buy">("play");
  const [loading, setLoading] = useState(true);
  
  const [spinData, setSpinData] = useState({
    totalSpins: 0,
    accumulatedWR: 0,
    lastFreeSpinAt: null as string | null,
  });

  // Fungsi untuk menangkap update dari PlayTab biar data gak RESET pas ganti tab
  const updateSpinData = (newData: any) => {
    setSpinData(prev => ({
      ...prev,
      totalSpins: newData.availableSpins,
      accumulatedWR: newData.accumulatedWR,
      lastFreeSpinAt: newData.lastFreeSpinAt
    }));
  };

  useEffect(() => {
    if (isOpen) {
      const fetchProfile = async () => {
        try {
          const res = await fetch("/api/spin/execute", { cache: 'no-store' });
          const data = await res.json();
          if (res.ok) {
            setSpinData({
              totalSpins: data.availableSpins,
              accumulatedWR: data.accumulatedWR,
              lastFreeSpinAt: data.lastFreeSpinAt,
            });
          }
        } catch (err) {
          console.error("Failed to load profile");
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90 px-4 backdrop-blur-md">
      <div className="w-full max-w-md h-[620px] flex flex-col rounded-[32px] bg-[#0f172a] text-white border border-white/10 overflow-hidden relative">
        
        {/* Header */}
        <div className="relative flex justify-between items-center p-6 border-b border-white/5">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500 mb-1 text-left">Neural Protocol</h2>
            <h3 className="font-black text-2xl italic uppercase tracking-tighter">Lucky <span className="text-slate-500">Center</span></h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Tab Nav */}
        <div className="flex bg-white/[0.02] border-b border-white/5">
          {[
            { id: 'play', label: 'LUCKY SPIN', icon: <Disc size={14} /> },
            { id: 'buy', label: 'BUY SPIN', icon: <ShoppingCart size={14} /> }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex-1 py-4 text-[10px] font-black tracking-[0.2em] transition-all relative flex items-center justify-center gap-2 ${
                tab === t.id ? 'text-cyan-400' : 'text-slate-500'
              }`}
            >
              {t.icon} {t.label}
              {t.id === 'play' && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-400 font-bold">
                  {spinData.totalSpins}
                </span>
              )}
              {tab === t.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-cyan-500 rounded-full" />}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-cyan-500" size={32} />
            </div>
          ) : (
            <div className="animate-in fade-in duration-500 h-full">
                {tab === 'play' ? (
                  <PlayTab 
                    initialData={{
                      availableSpins: spinData.totalSpins,
                      accumulatedWR: spinData.accumulatedWR,
                      lastFreeSpinAt: spinData.lastFreeSpinAt
                    }} 
                    onUpdate={updateSpinData} // Sync data biar gak reset
                  />
                ) : (
                  <BuyTab />
                )}
            </div>
          )}
        </div>

        {/* Footer (USDC Removed) */}
        <div className="p-6 bg-black/20 border-t border-white/5 flex justify-center items-center">
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Neural System Active</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SpinModal;