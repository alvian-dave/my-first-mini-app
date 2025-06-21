'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession(); // ✅ Tidak pakai `session` supaya tidak error lint
  const router = useRouter();
  const hasRedirected = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  // ✅ Hindari flicker saat hydration
  useEffect(() => {
    setHydrated(true);
  }, []);

  // ✅ Redirect hanya jika status benar-benar unauthenticated
  useEffect(() => {
    const timer = setTimeout(() => {
      if (status === 'unauthenticated' && !hasRedirected.current) {
        hasRedirected.current = true;
        router.replace('/');
      }
    }, 500); // beri delay agar status stabil

    return () => clearTimeout(timer);
  }, [status, router]);

  if (!hydrated || status === 'loading') return null;

  return (
    <Page>
      {children}
      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}