'use client'

import { Page } from '@/components/PageLayout';
import { AuthButton } from '../components/AuthButton';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      // Jika sudah login, redirect ke dashboard
      router.push('/home');
    }
  }, [status, router]);

  return (
    <Page>
      <Page.Main className="flex flex-col items-center justify-center">
        {status === 'loading' ? (
          <p>Loading...</p>
        ) : status === 'unauthenticated' ? (
          <AuthButton />
        ) : null}
      </Page.Main>
    </Page>
  );
}
