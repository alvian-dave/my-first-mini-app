'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';
import { useRef } from 'react';

export const Navigation = () => {
  const pathname = usePathname(); // contoh: "/home"
  const router = useRouter();
  const lastPath = useRef(pathname);

  const handleTabChange = (nextTab: string) => {
    const currentTab = lastPath.current?.split('/')[1] || 'home';
    if (currentTab === nextTab) return; // ⛔ Jangan navigasi kalau tab-nya sama

    lastPath.current = `/${nextTab}`;
    router.push(`/${nextTab}`);
  };

  const currentTab = pathname.split('/')[1] || 'home';

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