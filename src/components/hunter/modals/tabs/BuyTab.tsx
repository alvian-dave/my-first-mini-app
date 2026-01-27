"use client";

import React, { useState, useEffect } from "react";
import { Zap, CreditCard, Loader2 } from "lucide-react";
import { MiniKit } from "@worldcoin/minikit-js";
import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import { createPublicClient, http } from "viem";
import { worldchain } from "viem/chains";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

// ABI minimal buat transfer token
const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
];

const BuyTab = () => {
  const [transactionId, setTransactionId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session } = useSession();

  const client = createPublicClient({
    chain: worldchain,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL),
  });

  // Hook monitor konfirmasi (Persis pola Iklan)
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    client,
    appConfig: { app_id: process.env.NEXT_PUBLIC_APP_ID || "" },
    transactionId,
  });

  const showToast = (message: string, type: "success" | "error") => {
    toast[type](message, {
      duration: 4000,
      style: {
        backgroundColor: "#0f172a",
        color: type === "success" ? "#10b981" : "#ef4444",
        borderColor: "rgba(255,255,255,0.1)",
      },
    });
  };

  const handlePurchase = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const USDC_CONTRACT = process.env.NEXT_PUBLIC_USDC_CONTRACT;
      const TREASURY = process.env.NEXT_PUBLIC_WR_CONTRACT;
      const AMOUNT = "1000000"; // 1 USDC (6 desimal)

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: USDC_CONTRACT!,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [TREASURY!, AMOUNT],
          },
        ],
      });

      if (finalPayload.status === "error") {
        showToast("Transaction cancelled", "error");
        setIsSubmitting(false);
      } else {
        setTransactionId(finalPayload.transaction_id);
      }
    } catch (err) {
      showToast("Execution error", "error");
      setIsSubmitting(false);
    }
  };

  // Sync ke database setelah on-chain confirm
  useEffect(() => {
    if (!isConfirmed || !transactionId) return;

    const syncSpinQuota = async () => {
      try {
        const res = await fetch("/api/spin/buy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId }),
        });

        if (res.ok) {
          showToast("5 Spins added to your quota!", "success");
          setTimeout(() => window.location.reload(), 1500);
        } else {
          showToast("Sync failed", "error");
        }
      } catch (err) {
        showToast("Network error", "error");
      } finally {
        setIsSubmitting(false);
      }
    };

    syncSpinQuota();
  }, [isConfirmed, transactionId]);

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-xl text-center">
        <p className="text-cyan-400 text-sm font-bold">Neural Spin Pack</p>
        <div className="flex justify-center items-center gap-2 mt-1">
          <Zap size={20} className="text-yellow-400 fill-yellow-400" />
          <span className="text-3xl font-black text-white">5 SPINS</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <span className="text-slate-400 text-xs font-medium">Price</span>
          <span className="text-white font-bold text-sm">1.00 USDC</span>
        </div>

        <button
          onClick={handlePurchase}
          disabled={isSubmitting || isConfirming}
          className="w-full py-4 bg-slate-800 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black text-cyan-400 font-black rounded-xl transition-all flex items-center justify-center gap-3 group shadow-xl disabled:opacity-50"
        >
          {isSubmitting || isConfirming ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <CreditCard size={18} className="group-hover:text-black" />
          )}
          {isConfirming ? "VERIFYING..." : "AUTHORIZE PURCHASE"}
        </button>

        <p className="text-[9px] text-slate-500 text-center leading-relaxed">
          Transaction secured by neural-encryption.
          <br />
          Spins will be added instantly to your quota.
        </p>
      </div>
    </div>
  );
};

export default BuyTab;