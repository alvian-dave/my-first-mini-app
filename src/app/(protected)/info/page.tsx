import { Page } from '@/components/PageLayout';
import { Information } from '@/components/Information';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';

export default async function Infopage () {
    
  return (
      <>
        <Page.Header className="p-0">
        <TopBar
          title="WRC"
        />
      </Page.Header>
          <Information />
      </>
    );
  }