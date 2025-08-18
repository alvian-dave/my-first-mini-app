'use client'
import { useRouter } from 'next/navigation'

export const Login = () => {
  const router = useRouter()

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
            onClick={() => router.push('/login/client')}
            className="w-full py-2 rounded font-medium transition hover:brightness-110"
            style={{ backgroundColor: '#2563eb', color: '#fff' }} // force biru
          >
            Login as Promoter
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
            className="w-full py-2 rounded font-medium transition hover:brightness-110"
            style={{ backgroundColor: '#16a34a', color: '#fff' }} // force hijau
          >
            Login as Hunter
          </button>
        </div>
      </div>
    </div>
  )
}
