'use client';

import { useSession } from 'next-auth/react';

export const InfoImage = () => {
  const session = useSession();

  return (
    <div className="flex flex-col items-center justify-start px-4 py-6 space-y-4">
      {/* User ID dan Wallet Address */}
      <p className="text-black text-sm">User ID: {session?.data?.user?.user.id}</p>
      <p className="text-black text-sm">Wallet: {session?.data?.user?.username.walletAddress}</p>

      {/* Gambar SVG */}
      <img
        src="/images/empty-profile.svg"
        alt="Profile Illustration"
        className="w-60 h-auto"
      />
    </div>
  );
}
