'use client'

import { Page } from '@/components/PageLayout'
import { AuthButton } from '../components/AuthButton'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
        // Ambil activeRole dari database via API
        const res = await fetch('/api/roles/get')
        const data = await res.json()

        if (res.ok && data.success && data.activeRole) {
          // Redirect sesuai role
          if (data.activeRole === 'promoter') {
            router.push('/dashboard/promoter')
          } else if (data.activeRole === 'hunter') {
            router.push('/dashboard/hunter')
          } else {
            router.push('/home') // fallback
          }
        } else {
          // User belum punya activeRole, redirect ke halaman login/role pilih
          router.push('/login')
        }
      } catch (err) {
        console.error(err)
        router.push('/login')
      }
    }

    checkRedirect()
  }, [status, router])

  return (
    <Page>
      <Page.Main className="flex flex-col items-center justify-center">
        {status === 'loading' || loading ? (
          <p>Loading...</p>
        ) : status === 'unauthenticated' ? (
          <AuthButton />
        ) : null}
      </Page.Main>
    </Page>
  )
}
