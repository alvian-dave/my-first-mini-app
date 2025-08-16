'use client';

import { Page } from '@/components/PageLayout';
import { Login } from '@/components/Login';
import { Balance } from '@/components/Balance';
import { Navigation } from '@/components/Navigation'; // ✅ Import navigation

export default function Home() {
  return (
    <Page>
      <Page.Header className="p-0">
  <div className="flex justify-between items-center px-4 pt-3 w-full">
    <img src="/logo.png" alt="Logo" style={{ height: '56px', width: 'auto' }} />
    <Balance />
  </div>
</Page.Header>

      <Page.Main className="pb-[80px] flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white">
  <Login />
      </Page.Main>

      <Page.Footer className="fixed bottom-0 w-full z-20">
  <Navigation />
</Page.Footer>
      </Page.Footer>
    </Page>
  );
}