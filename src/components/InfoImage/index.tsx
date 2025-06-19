'use client';

import { useSession } from 'next-auth/react';

export const InfoImage = () => {
  const session = useSession();
  const wallet = session?.data?.user?.walletAddress;

  return (
    <div className="flex flex-col items-center px-6 py-10 space-y-12">
      {/* Wallet Address Box */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-4 rounded-2xl shadow-lg w-full max-w-md text-center">
        <p className="text-sm font-semibold tracking-wide uppercase text-white/80 mb-1">
          Wallet Address
        </p>
        <p className="text-base font-mono break-all">{wallet}</p>
      </div>

      {/* SVG Illustration */}
      <img
        src="/images/empty-profile.svg"
        alt="Profile Illustration"
        className="w-72 h-auto opacity-90"
      />
    </div>
  );
};