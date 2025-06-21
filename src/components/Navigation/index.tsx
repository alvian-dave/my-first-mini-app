'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [currentTab, setCurrentTab] = useState(() => {
    return pathname.split('/')[1] || 'home';
  });

  useEffect(() => {
    const path = pathname.split('/')[1] || 'home';
    setCurrentTab(path);
    sessionStorage.setItem('last-tab', path);
  }, [pathname]);

  const handleTabChange = (nextTab: string) => {
    const lastTab = sessionStorage.getItem('last-tab');

    if (lastTab === nextTab) {
      // ⛔ Tab sama, jangan lakukan apa pun
      return;
    }

    sessionStorage.setItem('last-tab', nextTab);
    router.push(`/${nextTab}`);
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