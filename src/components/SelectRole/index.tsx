'use client'
import { useRouter } from 'next/navigation'

export const SelectRole = () => {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white">
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
              onClick={() => router.push('/login/client')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
            >
              Login as Client
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
              onClick={() => router.push('/login/hunter')}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
            >
              Login as Hunter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}