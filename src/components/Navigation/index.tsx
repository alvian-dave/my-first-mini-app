'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';

export const Navigation = () => {
  const pathname = usePathname(); // contoh: /home
  const router = useRouter();
  const currentTab = pathname.split('/')[1] || 'home';

  const handleTabChange = (tab: string) => {
    if (tab === currentTab) return; // ✅ Jangan navigasi ulang ke tab yang sama
    router.push(`/${tab}`);
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