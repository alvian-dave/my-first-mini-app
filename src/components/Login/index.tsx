'use client'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export const Login = () => {
  const router = useRouter()
  const { data: session } = useSession() // ambil userId dari session

  // fungsi handle login dan update role
  const handleLogin = async (role: 'promoter' | 'hunter') => {
    if (!session?.user?.id) {
      alert('User not logged in');
      return;
    }

    const res = await fetch('/api/roles/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.user.id, role }),
    });

    const data = await res.json();
    if (data.success) {
      // redirect sesuai role
      router.push(role === 'promoter' ? '/dashboard/promoter' : '/dashboard/hunter');
    } else {
      alert('Gagal update role: ' + data.message);
    }
  };

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
            onClick={() => handleLogin('promoter')}
            className="w-full py-2 rounded font-medium transition hover:brightness-110"
            style={{ backgroundColor: '#2563eb', color: '#fff' }}
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
            onClick={() => handleLogin('hunter')}
            className="w-full py-2 rounded font-medium transition hover:brightness-110"
            style={{ backgroundColor: '#16a34a', color: '#fff' }}
          >
            Login as Hunter
          </button>
        </div>
      </div>
    </div>
  )
}
