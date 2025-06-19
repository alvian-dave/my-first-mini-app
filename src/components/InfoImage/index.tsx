'use client';

import { useSession } from 'next-auth/react';

export const InfoImage = () => {
  const session = useSession();
  const wallet = session?.data?.user?.walletAddress;

  return (
    <div className="flex flex-col items-center px-6 py-10 space-y-10">
      {/* Wallet Info */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-500 mb-1">Wallet Address</p>
        <p className="text-xs font-mono text-gray-700 break-all">{wallet}</p>
      </div>

      {/* Highlight Message */}
      <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-indigo-600 tracking-tight">
        you’re early 🚀
      </h2>

      {/* SVG Illustration */}
      <img
        src="/images/empty-profile.svg"
        alt="Profile Illustration"
        className="w-72 h-auto opacity-95"
      />
    </div>
  );
};