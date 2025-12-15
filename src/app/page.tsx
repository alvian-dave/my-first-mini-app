"use client";

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AuthButton } from "../components/AuthButton"
import { Loader2 } from "lucide-react"

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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white relative">
      
      {/* --- Tambahkan Style CSS untuk Efek Api di sini --- */}
      <style jsx>{`
        .fire-text {
          color: white;
          text-shadow: 
            0 0 7px #fff,
            0 -10px 25px #22c55e, 
            0 -20px 35px #3b82f6;
          animation: flicker 1.5s infinite alternate;
        }

        @keyframes flicker {
          0%, 100% {
            text-shadow: 
              0 0 4px #fff,
              0 -5px 15px #3b82f6, 
              0 -15px 30px #22c55e;
          }
          50% {
            text-shadow: 
              0 0 9px #fff,
              0 -12px 25px #22c55e, 
              0 -22px 40px #3b82f6;
          }
        }
      `}</style>

      {status === "loading" || loading ? (
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-gray-300">Loading...</p>
        </div>
      ) : status === "unauthenticated" ? (
        <section className="max-w-3xl text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Judul dengan Class fire-text */}
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4 fire-text">
            Welcome to WR Bounty Platform
          </h1>

          <p className="text-gray-300 text-lg sm:text-xl max-w-xl mx-auto mb-8">
            A mini app where <span className="text-green-400">hunters</span> earn rewards and
            <span className="text-blue-400"> project owners</span> launch campaigns.
          </p>

          <div className="flex justify-center">
            <AuthButton />
          </div>
        </section>
      ) : null}

      <footer className="mt-16 text-sm text-gray-500">
        © {new Date().getFullYear()} WR Bounty Platform. All rights reserved.
      </footer>
    </main>
  )
}