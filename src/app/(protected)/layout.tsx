'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const hasRedirected = useRef(false);
  const [hasSession, setHasSession] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // ⏳ Tandai bahwa komponen sudah ter-render di client
  useEffect(() => {
    setHydrated(true);
  }, []);

  // ✅ Tandai jika session sudah pernah authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      setHasSession(true);
    }

    // ❌ Redirect hanya jika belum login dan status tidak lagi loading
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

  // 🛑 Hindari render jika belum hydration atau sedang proses auth
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