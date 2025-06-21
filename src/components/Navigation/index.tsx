'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';

export const Navigation = () => {
  const pathname = usePathname();        
  const router = useRouter();

  const currentTab = pathname.split('/')[1] || 'home';

  return (
    <Tabs
      value={currentTab}
      onValueChange={(nextTab) => {
        if (nextTab === currentTab) return; // ⛔️ Cegah navigasi jika tab sama
        router.push(`/${nextTab}`);
      }}
      className="h-full flex items-center !mt-0"
    >
      <TabItem value="home" icon={<Home />} label="Home" />
      <TabItem value="info" icon={<InfoCircle />} label="Info" />
      <TabItem value="profile" icon={<User />} label="Profile" />
    </Tabs>
  );
};