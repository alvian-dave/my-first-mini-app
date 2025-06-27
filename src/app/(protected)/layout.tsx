'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (
      hydrated &&
      status === 'unauthenticated' &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [status, hydrated, router]);

  if (!hydrated || status === 'loading') return null;

  return <>{children}</>;
}