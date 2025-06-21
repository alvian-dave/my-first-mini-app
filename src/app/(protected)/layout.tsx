'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // ⛔️ Jangan redirect kalau masih loading
    if (status === 'loading') return;

    // ✅ Redirect hanya sekali kalau benar-benar tidak ada session
    if (status === 'unauthenticated' && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [status, router]);

  // ⏳ Jangan render apa-apa saat masih loading atau sebelum session stabil
  if (status === 'loading' || (status === 'unauthenticated' && !hasRedirected.current)) {
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