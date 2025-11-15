'use client';

import { Login } from '@/components/Login';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white px-6">
      <Login />
    </main>
  );
}
