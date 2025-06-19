import { Page } from '@/components/PageLayout';
import { Amount } from '@/components/Amount';
import { Transaction } from '@/components/Transaction';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';

export default async function Home() {

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          title="WRC"
        />
      </Page.Header>
      <Page.Main className="flex flex-col items-center justify-start gap-4 mb-16">
        <Amount />
        <Transaction />
      </Page.Main>
    </>
  );
}
