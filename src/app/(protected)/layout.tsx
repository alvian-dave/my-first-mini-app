'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession(); // ✅ hanya ambil status, karena session tidak digunakan
  const router = useRouter();

  const hasRedirected = useRef(false);
  const [hasSession, setHasSession] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // ⏳ Tandai bahwa komponen sudah di-render di client
  useEffect(() => {
    setHydrated(true);
  }, []);

  // ✅ Update state jika pernah authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      setHasSession(true);
    }

    // ❌ Redirect jika tidak login dan status sudah final
    if (
      hydrated &&
      status !== 'loading' &&
      status === 'unauthenticated' &&
      !hasRedirected.current &&
      !hasSession
    ) {
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [status, router, hasSession, hydrated]);

  // 🛑 Jangan render apapun saat loading atau belum login
  if (
    !hydrated ||
    (status === 'unauthenticated' && !hasSession && status !== 'loading')
  ) {
    return null;
  }

  return (
    <Page>
      {children}
      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}