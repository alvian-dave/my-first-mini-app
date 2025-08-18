'use client'

import { useSession, signOut } from 'next-auth/react'

const ProfileModal = ({ onClose }: { onClose: () => void }) => {
  const { data: session, status } = useSession()
  if (status === 'loading' || !session) return null

  const user = session.user
  const username = user?.name || 'Anonymous'
  const userId = user?.id || 'Unknown'
  const walletAddress = user?.walletAddress || 'Not set'

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.href = '/home'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded bg-white dark:bg-gray-900 p-6 text-gray-800 dark:text-white shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-3 top-2 text-xl font-bold"
        >
          ✕
        </button>

        <h1 className="mb-4 text-2xl font-bold">👤 Profile</h1>

        <div className="mb-6 rounded bg-gray-100 dark:bg-gray-800 p-4 shadow">
          <p><strong>Username:</strong> {username}</p>
          <p><strong>User ID:</strong> {userId}</p>
          <p><strong>Wallet Address:</strong> {walletAddress}</p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileModal
