'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';

export const Navigation = () => {
  const pathname = usePathname();        // misalnya: "/info"
  const router = useRouter();

  const currentTab = pathname.split('/')[1] || 'home'; // ambil nama tab dari URL

  return (
    <Tabs value={currentTab} onValueChange={(tab) => router.push(`/${tab}`)}>
      className="h-full flex items-center"
      <TabItem value="home" icon={<Home />} label="Home" />
      <TabItem value="info" icon={<InfoCircle />} label="Info" />
      <TabItem value="profile" icon={<User />} label="Profile" />
    </Tabs>
  );
};