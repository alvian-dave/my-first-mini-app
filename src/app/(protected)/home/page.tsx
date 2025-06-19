import { Page } from '@/components/PageLayout';
import { Amount } from '@/components/Amount';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';

export default async function Home() {

  return (
    <>
      <Page.Header className="p-0">
          <TopBar
            title="WRC"
          />
        </Page.Header>
      <Page.Main className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] -mt-14">
  <Amount />
</Page.Main>
    </>
  );
}
