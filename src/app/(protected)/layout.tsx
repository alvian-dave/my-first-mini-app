'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession(); // hanya ambil 'status', karena 'session' tidak digunakan
  const router = useRouter();

  const hasRedirected = useRef(false);
  const [hasSession, setHasSession] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // ⚡ Komponen siap di-render di client
  useEffect(() => {
    setHydrated(true);
  }, []);

  // 🧠 Logika redirect jika user benar-benar belum login
  useEffect(() => {
    if (status === 'authenticated') {
      setHasSession(true);
    }

    // ⛔ Cegah redirect saat status masih 'loading'
    if (
      hydrated &&
      status === 'unauthenticated' &&
      !hasSession &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [status, router, hasSession, hydrated]);

  // 🛑 Jangan render apa pun saat belum ready
  const shouldBlockRender =
    !hydrated || (status === 'unauthenticated' && !hasSession);

  if (shouldBlockRender) return null;

  return (
    <Page>
      {children}
      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}