'use client';

import { Login } from '@/components/Login';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white px-4">
      <Login />
    </div>
  );
}
