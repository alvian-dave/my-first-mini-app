'use client';

import { Page } from '@/components/PageLayout';
import { Amount } from '@/components/Amount';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { Balance } from '@/components/Balance';

export default function Home() {
  return (
    <Page>
      <Page.Header className="p-0">
        <div className="flex justify-between items-center px-4 pt-3 w-full">
          <TopBar title="WRC" />
          <Balance />
        </div>
      </Page.Header>

      <Page.Main className="flex flex-col items-center justify-center">
        <Amount />
      </Page.Main>
    </Page>
  );
}