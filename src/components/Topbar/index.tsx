'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Lazy-load ProfileModal agar tidak membebani SSR
const ProfileModal = dynamic(() => import('@/components/ProfileModal'), {
  ssr: false,
})

export const Topbar = () => {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const username =
    session?.user?.name ||
    session?.user?.walletAddress?.split('@')[0] ||
    'Unknown User'

  // sementara role pakai user.id
  const role = session?.user?.id || ''

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut({ redirect: false }) // hapus cookie manual sudah tidak perlu
      router.push('/home') // lebih rapi pakai router push
    } catch (err) {
      console.error('❌ Logout failed:', err)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleGoToProfile = () => {
    setIsMenuOpen(false)
    setShowProfile(true)
  }

  return (
    <>
      <header className="w-full bg-gray-900 text-white px-6 py-4 shadow flex justify-between items-center relative z-40">
        <div className="flex items-center gap-3 select-none">
          <img src="/logo.png" alt="Logo" className="w-8 h-8" />
          <h1 className="text-xl font-bold tracking-wide">World Reward</h1>
        </div>

        {status === 'authenticated' && (
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="User menu"
              className="p-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring focus:ring-blue-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                />
              </svg>
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 mt-3 w-64 bg-white text-gray-800 rounded-md shadow-lg overflow-hidden animate-fade-in-up"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {username}
                  </p>
                  <p className="text-xs text-green-600 uppercase">{role}</p>
                </div>

                <ul className="divide-y divide-gray-200 text-sm">
                  <li className="flex justify-between items-center px-4 py-2 text-gray-400 cursor-not-allowed">
                    <span>Main balance</span>
                    <span className="font-medium">—</span>
                  </li>
                  <li className="flex justify-between items-center px-4 py-2 text-gray-400 cursor-not-allowed">
                    <span>Staking balance</span>
                    <span className="font-medium">—</span>
                  </li>

                  {/* ✅ Active profile button */}
                  <li>
                    <button
                      onClick={handleGoToProfile}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition"
                    >
                      Profile
                    </button>
                  </li>

                  <li className="px-4 py-2 text-gray-400 cursor-not-allowed">Top-up</li>
                  <li className="px-4 py-2 text-gray-400 cursor-not-allowed">Withdraw</li>
                  <li className="px-4 py-2 text-gray-400 cursor-not-allowed">Notification</li>
                  <li className="px-4 py-2 text-gray-400 cursor-not-allowed">Contact us</li>

                  <li className="px-4 py-2">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className={`w-full text-left font-medium text-red-600 hover:text-red-700 transition ${
                        isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isLoggingOut ? 'Logging out…' : 'Logout'}
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </header>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  )
}
