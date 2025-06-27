'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export const Navigation = () => {
  const pathname = usePathname(); // contoh: /home
  const router = useRouter();
  const currentTab = pathname.split('/')[1] || 'home';

  const [flashTab, setFlashTab] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (nextTab: string) => {
    if (nextTab === currentTab) {
      // 🔥 Tambahkan class animasi
      setFlashTab(nextTab);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setFlashTab(null), 400);
      return;
    }
    router.push(`/${nextTab}`);
  };

  const getTabClass = (tab: string) =>
    flashTab === tab ? 'flash-on-click' : '';

  return (
    <Tabs
      value={currentTab}
      onValueChange={handleChange}
      className="h-full flex items-center !mt-0"
    >
      <TabItem
        value="home"
        icon={<Home />}
        label="Home"
        className={getTabClass('home')}
      />
      <TabItem
        value="info"
        icon={<InfoCircle />}
        label="Info"
        className={getTabClass('info')}
      />
      <TabItem
        value="profile"
        icon={<User />}
        label="Profile"
        className={getTabClass('profile')}
      />
    </Tabs>
  );
};