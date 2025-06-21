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

  // 🧠 Tandai user pernah login
  const hasSession = useRef(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      hasSession.current = true;
    }

    if (
      status === 'unauthenticated' &&
      !hasRedirected.current &&
      !hasSession.current
    ) {
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [status, router]);

  if (!hydrated || (status === 'unauthenticated' && !hasSession.current)) {
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