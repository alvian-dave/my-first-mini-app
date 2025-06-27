'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession(); // ✅ Tidak pakai session → aman dari unused var
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const shouldRedirect =
      hydrated &&
      status === 'unauthenticated' &&
      !hasRedirected.current;

    if (shouldRedirect) {
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [status, hydrated, router]);

  // ✅ Aman: tunggu hydration + status stabil (bukan loading)
  if (!hydrated || status === 'loading') {
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