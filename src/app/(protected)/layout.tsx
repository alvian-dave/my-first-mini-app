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

  const [hydrated, setHydrated] = useState(false);

  // ✅ Hindari redirect tergesa-gesa
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [status, router]);

  // ✅ Hindari flicker saat hydration di sisi klien
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated || status === 'loading' || (status === 'unauthenticated' && !hasRedirected.current)) {
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