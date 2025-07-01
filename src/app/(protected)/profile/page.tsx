'use client';

import { Page } from '@/components/PageLayout';
import { InfoImage } from '@/components/InfoImage';
import { Marble, TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { Navigation } from '@/components/Navigation';
import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <Page>
      <Page.Header className="p-0">
  <div className="flex items-center justify-between px-4 pt-3">
    <img src="/logo.png" alt="Logo" style={{ height: '56px', width: 'auto' }} />
    <div className="flex items-center gap-2">
      <p className="text-sm font-semibold capitalize">
        {session?.user.username}
      </p>
      <Marble src={session?.user.profilePictureUrl} className="w-12" />
    </div>
  </div>
</Page.Header>

      <Page.Main className="flex flex-col items-center justify-start gap-4 mb-16">
        <InfoImage />
      </Page.Main>

      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}