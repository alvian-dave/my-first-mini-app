import { Page } from '@/components/PageLayout';
import { UserInfo } from '@/components/UserInfo';
import { ViewPermissions } from '@/components/ViewPermissions';
import { Marble, TopBar } from '@worldcoin/mini-apps-ui-kit-react';

export default async function Profilpage () {
    
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
          <UserInfo />
          <ViewPermissions />
      </>
    );
  }