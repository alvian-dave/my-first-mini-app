'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';

export const Navigation = () => {
  const pathname = usePathname();       // contoh: "/info"
  const router = useRouter();

  const currentTab = pathname.split('/')[1] || 'home'; // 'home', 'info', atau 'profile'

  const handleTabChange = (tab: string) => {
    const targetPath = `/${tab}`;
    if (pathname !== targetPath) {
      router.push(targetPath); // hanya push jika path berbeda
    }
  };

  return (
    <Tabs
      value={currentTab}
      onValueChange={handleTabChange}
      className="h-full flex items-center !mt-0"
    >
      <TabItem value="home" icon={<Home />} label="Home" />
      <TabItem value="info" icon={<InfoCircle />} label="Info" />
      <TabItem value="profile" icon={<User />} label="Profile" />
    </Tabs>
  );
};