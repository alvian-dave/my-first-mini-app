'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const currentTab = pathname.split('/')[1] || 'home';

  const [clickedTab, setClickedTab] = useState<string | null>(null);

  const handleChange = (nextTab: string) => {
    if (nextTab === currentTab) {
      setClickedTab(nextTab); // 🔄 Trigger flash
      return;
    }
    router.push(`/${nextTab}`);
  };

  // ⏱ Reset class setelah animasi selesai
  useEffect(() => {
    if (clickedTab) {
      const timer = setTimeout(() => setClickedTab(null), 400); // 400ms sesuai durasi animasi
      return () => clearTimeout(timer);
    }
  }, [clickedTab]);

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
        className={clsx(clickedTab === 'home' && 'flash-on-click')}
      />
      <TabItem
        value="info"
        icon={<InfoCircle />}
        label="Info"
        className={clsx(clickedTab === 'info' && 'flash-on-click')}
      />
      <TabItem
        value="profile"
        icon={<User />}
        label="Profile"
        className={clsx(clickedTab === 'profile' && 'flash-on-click')}
      />
    </Tabs>
  );
};