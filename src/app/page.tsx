'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AuthButton } from '../components/AuthButton'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkRedirect = async () => {
      if (status !== 'authenticated') {
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/roles/get')
        const data = await res.json()

        if (res.ok && data.success && data.activeRole) {
          if (data.activeRole === 'promoter') {
            router.push('/dashboard/promoter')
          } else if (data.activeRole === 'hunter') {
            router.push('/dashboard/hunter')
          } else {
            router.push('/home')
          }
        } else {
          router.push('/home')
        }
      } catch (err) {
        console.error(err)
        router.push('/home')
      }
    }

    checkRedirect()
  }, [status, router])

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem',
        background: 'linear-gradient(to bottom right, #111827, #1f2937, #000000)',
        color: 'white',
        textAlign: 'center',
      }}
    >
      {status === 'loading' || loading ? (
        <p>Loading...</p>
      ) : status === 'unauthenticated' ? (
        <>
          {/* Welcome Text */}
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              marginBottom: '1rem',
            }}
          >
            Welcome to <span style={{ color: '#3b82f6' }}>WR Bounty Platform</span>
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: '#d1d5db',
              maxWidth: '32rem',
              margin: '0 auto 2rem',
            }}
          >
            A mini app where <span style={{ color: '#10b981' }}>hunters</span> earn rewards and{' '}
            <span style={{ color: '#3b82f6' }}>project owners</span> launch campaigns.
          </p>

          {/* Login Button */}
          <AuthButton />
        </>
      ) : null}

      {/* Footer */}
      <footer
        style={{
          marginTop: '4rem',
          fontSize: '0.875rem',
          color: '#6b7280',
        }}
      >
        © {new Date().getFullYear()} WR Bounty Platform. All rights reserved.
      </footer>
    </main>
  )
}
