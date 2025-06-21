'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';
import { useRef } from 'react';

export const Navigation = () => {
  const pathname = usePathname(); // e.g. /home
  const router = useRouter();
  const lastTab = useRef<string | null>(null);

  const currentTab = pathname.split('/')[1] || 'home';

  const handleChange = (nextTab: string) => {
    if (nextTab === currentTab || nextTab === lastTab.current) {
      return; // 🛑 Jangan lakukan apa pun kalau tab sama
    }
    lastTab.current = nextTab;
    router.push(`/${nextTab}`);
  };

  return (
    <Tabs
      value={currentTab}
      onValueChange={handleChange}
      className="h-full flex items-center !mt-0"
    >
      <TabItem value="home" icon={<Home />} label="Home" />
      <TabItem value="info" icon={<InfoCircle />} label="Info" />
      <TabItem value="profile" icon={<User />} label="Profile" />
    </Tabs>
  );
};