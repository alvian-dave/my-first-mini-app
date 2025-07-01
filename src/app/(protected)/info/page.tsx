'use client';

import { Page } from '@/components/PageLayout';
import { Information } from '@/components/Information';
import { Navigation } from '@/components/Navigation';

export default function InfoPage() {
  return (
    <Page>
      <Page.Header className="p-0">
        <div className="flex justify-between items-center px-4 pt-3 w-full">
          <img src="/logo.png" alt="Logo" style={{ height: '56px', width: 'auto' }} />
        </div>
      </Page.Header>

      <Page.Main className="flex flex-col items-center justify-start gap-4 mb-16">
        <Information />
      </Page.Main>

      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}