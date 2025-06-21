'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession(); // ✅ hanya ambil `status`, hindari unused `session`
  const router = useRouter();
  const hasRedirected = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  // 🌐 Hindari redirect terlalu dini
  useEffect(() => {
    if (status === 'unauthenticated' && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [status, router]);

  // 💧 Hindari flash layout saat first hydration
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