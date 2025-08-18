'use client';

import { Login } from '@/components/Login';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white px-4">
      {/* Welcome Text */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Welcome to <span className="text-blue-400">Bounty Platform</span>
        </h1>
        <p className="mt-4 text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
          A mini app where <span className="text-green-400">hunters</span> earn
          rewards and <span className="text-blue-400">project owners</span>{' '}
          launch campaigns.
        </p>
      </div>

      {/* Login Cards */}
      <Login />

      {/* Footer */}
      <footer className="mt-16 text-gray-500 text-sm">
        © {new Date().getFullYear()} Bounty Platform. All rights reserved.
      </footer>
    </main>
  );
}
