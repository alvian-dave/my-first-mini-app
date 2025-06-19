import { Page } from '@/components/PageLayout';
import { Amount } from '@/components/Amount';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';

export default async function Home() {

  return (
    <>
      <Page.Header className="p-0">
  <TopBar
  startAdornment={
    <img
      src="/favicon.png"
      alt="Logo"
      className="h-14 w-auto"
    />
  }
  title="" // kosongkan
/>
</Page.Header>
      <Page.Main className="flex flex-col items-center justify-start gap-4 mb-16">
        <Amount />
      </Page.Main>
    </>
  );
}
