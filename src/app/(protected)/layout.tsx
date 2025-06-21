'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasRedirected = useRef(false);
  const [hasSession, setHasSession] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // ⏳ Set hydrated = true saat komponen siap di client
  useEffect(() => {
    setHydrated(true);
  }, []);

  // ✅ Tandai jika session pernah authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      setHasSession(true);
    }

    // ❌ Redirect hanya jika belum pernah authenticated
    if (status === 'unauthenticated' && !hasRedirected.current && !hasSession) {
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [status, router, hasSession]);

  // 🛑 Hindari render jika belum hydration atau redirect sedang berjalan
  if (!hydrated || (status === 'unauthenticated' && !hasSession)) {
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