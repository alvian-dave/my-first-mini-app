'use client'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

export const Login = () => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)

  if (status === 'loading') {
    return <p>Loading session...</p>
  }

  if (!session?.user?.id) {
    return <p>Please login first to continue.</p>
  }

  const handleLogin = async (role: 'promoter' | 'hunter') => {
    setLoading(true)
    try {
      const res = await fetch('/api/roles/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }), // pakai API auth() jadi tidak perlu userId
      })

      if (!res.ok) throw new Error('Network response was not ok')

      const data = await res.json()
      if (data.success) {
        router.push(role === 'promoter' ? '/dashboard/promoter' : '/dashboard/hunter')
      } else {
        alert('Gagal update role: ' + data.message)
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan, cek console')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
      {/* CLIENT CARD */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col justify-between transition hover:shadow-2xl">
        <div>
          <h2 className="text-xl font-bold text-blue-400">For Project Owners</h2>
          <p className="mt-2 text-gray-300">
            Launch your own campaign and distribute rewards to real humans.
          </p>
        </div>
        <div className="mt-4">
          <button
            disabled={loading}
            onClick={() => handleLogin('promoter')}
            className="w-full py-2 rounded font-medium transition hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: '#2563eb', color: '#fff' }}
          >
            {loading ? 'Processing...' : 'Login as Promoter'}
          </button>
        </div>
      </div>

      {/* HUNTER CARD */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col justify-between transition hover:shadow-2xl">
        <div>
          <h2 className="text-xl font-bold text-green-400">For Bounty Hunters</h2>
          <p className="mt-2 text-gray-300">
            Earn crypto by completing simple tasks and proving you’re human.
          </p>
        </div>
        <div className="mt-4">
          <button
            disabled={loading}
            onClick={() => handleLogin('hunter')}
            className="w-full py-2 rounded font-medium transition hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: '#16a34a', color: '#fff' }}
          >
            {loading ? 'Processing...' : 'Login as Hunter'}
          </button>
        </div>
      </div>
    </div>
  )
}
