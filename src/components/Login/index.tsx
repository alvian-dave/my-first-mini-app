'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Login = () => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loadingRole, setLoadingRole] = useState<'promoter' | 'hunter' | null>(null)

  if (status === 'loading') return <p className="text-center py-20">Loading session...</p>
  if (!session?.user?.id) return <p className="text-center py-20 text-red-500">Please login first to continue.</p>

  const handleLogin = async (role: 'promoter' | 'hunter') => {
    setLoadingRole(role)
    try {
      const res = await fetch('/api/roles/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Unknown error')

      if (data.success) {
        router.push(role === 'promoter' ? '/dashboard/promoter' : '/dashboard/hunter')
      } else {
        throw new Error(data.message || 'Failed to update role')
      }
    } catch (err: any) {
      console.error('Error updating role:', err)
      alert(`Terjadi kesalahan: ${err.message}`)
    } finally {
      setLoadingRole(null)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto py-16">
      {/* Promoter Card */}
      <Card className="border border-blue-500 hover:shadow-lg transition duration-300">
        <CardHeader>
          <CardTitle className="text-blue-600">For Project Owners</CardTitle>
          <CardDescription>
            Launch your own campaign and distribute rewards to real humans.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <Button
            variant="default"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            disabled={loadingRole === 'promoter'}
            onClick={() => handleLogin('promoter')}
          >
            {loadingRole === 'promoter' ? 'Processing...' : 'Promoter Dashboard'}
          </Button>
        </CardContent>
      </Card>

      {/* Hunter Card */}
      <Card className="border border-green-500 hover:shadow-lg transition duration-300">
        <CardHeader>
          <CardTitle className="text-green-600">For Bounty Hunters</CardTitle>
          <CardDescription>
            Earn crypto by completing simple tasks and proving you’re human.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <Button
            variant="default"
            className="w-full bg-green-600 text-white hover:bg-green-700"
            disabled={loadingRole === 'hunter'}
            onClick={() => handleLogin('hunter')}
          >
            {loadingRole === 'hunter' ? 'Processing...' : 'Hunter Dashboard'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
