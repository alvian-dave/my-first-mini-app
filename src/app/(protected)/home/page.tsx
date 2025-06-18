import { auth } from '@/auth';
import { Page } from '@/components/PageLayout';
import { Amount } from '@/components/Amount';
import { Transaction } from '@/components/Transaction';
import { Information } from '@/components/Information';
import { Marble, TopBar } from '@worldcoin/mini-apps-ui-kit-react';

export default async function Home() {
  const session = await auth();

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          title="WRC"
          endAdornment={
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold capitalize">
                {session?.user.username}
              </p>
              <Marble src={session?.user.profilePictureUrl} className="w-12" />
            </div>
          }
        />
      </Page.Header>
      <Page.Main className="flex flex-col items-center justify-start gap-4 mb-16">
        <Amount />
        <Transaction />
        <Information />
      </Page.Main>
    </>
  );
}
