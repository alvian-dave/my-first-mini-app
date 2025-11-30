import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AuthButton } from "../components/AuthButton"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { data: session, status } = useSession()
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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {status === "loading" || loading ? (
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-gray-300">Loading...</p>
        </div>
      ) : status === "unauthenticated" ? (
        <Card className="w-full max-w-lg bg-gray-900/80 backdrop-blur border-gray-700 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Welcome to <span className="text-blue-500">WR Bounty Platform</span>
            </CardTitle>
            <CardDescription className="text-center text-gray-300 text-base mt-2">
              A mini app where <span className="text-emerald-400">hunters</span> earn rewards and
              <span className="text-blue-400"> project owners</span> launch campaigns.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center mt-4">
            <AuthButton />
          </CardContent>
        </Card>
      ) : null}

      <footer className="mt-10 text-sm text-gray-500">
        © {new Date().getFullYear()} WR Bounty Platform. All rights reserved.
      </footer>
    </main>
  )
}
