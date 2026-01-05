"use client";

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AuthButton } from "../components/AuthButton"
import { Loader2, ShieldCheck, Zap, Globe } from "lucide-react"

export default function Home() {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkRedirect = async () => {
      if (status !== "authenticated") {
        setLoading(false)
        return
      }

      try {
        const res = await fetch("/api/roles/get")
        const data = await res.json()

        if (res.ok && data.success && data.activeRole) {
          if (data.activeRole === "promoter") {
            router.push("/dashboard/promoter")
          } else if (data.activeRole === "hunter") {
            router.push("/dashboard/hunter")
          } else {
            router.push("/home")
          }
        } else {
          router.push("/home")
        }
      } catch (err) {
        console.error(err)
        router.push("/home")
      }
    }

    checkRedirect()
  }, [status, router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#020617] text-white relative overflow-hidden">
      
      {/* Background Decor - Cyber Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <style jsx>{`
        .fire-text {
          text-shadow: 
            0 0 10px rgba(255,255,255,0.2),
            0 -5px 15px rgba(34, 197, 94, 0.4), 
            0 -15px 30px rgba(59, 130, 246, 0.3);
          animation: flicker 2s infinite alternate;
        }

        @keyframes flicker {
          0%, 100% {
            text-shadow: 0 0 8px #fff, 0 -5px 15px #3b82f6, 0 -15px 30px #22c55e;
            transform: scale(1);
          }
          50% {
            text-shadow: 0 0 12px #fff, 0 -8px 20px #22c55e, 0 -18px 35px #3b82f6;
            transform: scale(1.01);
          }
        }
      `}</style>

      {status === "loading" || loading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <div className="absolute inset-0 blur-lg bg-emerald-500/50 animate-pulse" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Initializing Protocol...</p>
        </div>
      ) : status === "unauthenticated" ? (
        <section className="relative w-full max-w-[400px] flex flex-col items-center animate-in fade-in zoom-in duration-700">
          
          <div className="relative w-full bg-[#0f172a]/60 backdrop-blur-xl border border-white/10 p-8 rounded-[40px] overflow-hidden">
            {/* Inner Glow Side */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_25px_rgba(255,255,255,0.05)]" />
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Network Online</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black leading-none mb-6 fire-text italic uppercase tracking-tighter">
                Welcome to <br/>
                <span className="text-white">WR Bounty</span> <br/>
                <span className="text-emerald-400">Platform</span>
              </h1>

              <p className="text-slate-400 text-sm leading-relaxed mb-8 px-2 font-medium">
                A mini app where <span className="text-emerald-400 font-bold">hunters</span> earn rewards and
                <span className="text-blue-400 font-bold"> project owners</span> launch campaigns.
              </p>

              <div className="flex flex-col items-center gap-4">
                <AuthButton />
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                  Secure On-Chain Connection
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 rounded-2xl border border-white/5">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase">Fast</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 rounded-2xl border border-white/5">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase">Secure</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 rounded-2xl border border-white/5">
              <Globe className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase">Global</span>
            </div>
          </div>

        </section>
      ) : null}

      <footer className="absolute bottom-8 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
        © {new Date().getFullYear()} WR BOUNTY PROTOCOL
      </footer>
    </main>
  )
}