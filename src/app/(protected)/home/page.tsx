'use client';

import { Page } from '@/components/PageLayout';
import { Amount } from '@/components/Amount';
import { Balance } from '@/components/Balance';
import { Navigation } from '@/components/Navigation'; // ✅ Import navigation

export default function Home() {
  return (
    <Page>
      <Page.Header className="p-0">
  <div className="flex justify-between items-center px-4 pt-3 w-full">
    <img src="/logo.png" alt="Logo" style={{ height: '48px', width: 'auto' }} />
    <Balance />
  </div>
</Page.Header>

      <Page.Main className="flex flex-col items-center justify-center">
        <Amount />
      </Page.Main>

      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}