'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';

export const Navigation = () => {
  const pathname = usePathname(); // Dapatkan path saat ini, misal "/info"
  const router = useRouter();

  // Ambil nama tab dari path, misal "/info" => "info"
  const currentTab = pathname.split('/')[1] || 'home';

  return (
    <Tabs value={currentTab} onValueChange={(tab) => router.push(`/${tab}`)}>
      <TabItem value="home" icon={<Home />} label="Home" />
      <TabItem value="info" icon={<InfoCircle />} label="info" />
      <TabItem value="profile" icon={<User />} label="Profile" />
    </Tabs>
  );
};
