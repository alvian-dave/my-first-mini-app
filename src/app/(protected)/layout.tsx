'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // 🧠 Hanya redirect kalau status memang "unauthenticated"
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  // ⏳ Jangan render apa pun saat loading untuk menghindari flicker/redirect palsu
  if (status === 'loading') {
    return null;
  }

  // ✅ Session sudah valid, tampilkan layout
  return (
    <Page>
      {children}
      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}