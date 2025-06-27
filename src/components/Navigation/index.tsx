'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, InfoCircle, User } from 'iconoir-react';
import { Tabs, TabItem } from '@worldcoin/mini-apps-ui-kit-react';
import { useState } from 'react';
import clsx from 'clsx';

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const currentTab = pathname.split('/')[1] || 'home';
  const [clickedTab, setClickedTab] = useState<string | null>(null);

  const handleChange = (nextTab: string) => {
    if (nextTab === currentTab) {
      setClickedTab(nextTab); // Trigger flash
      setTimeout(() => setClickedTab(null), 300); // Reset
      return;
    }
    router.push(`/${nextTab}`);
  };

  return (
    <div className="w-full border-t border-border bg-white">
      <Tabs
        value={currentTab}
        onValueChange={handleChange}
        className="w-full flex justify-between items-center"
      >
        <TabItem
          value="home"
          icon={<Home />}
          label="Home"
          className={clsx(
            'flex-1 text-center py-2',
            clickedTab === 'home' && 'flash-on-click'
          )}
        />
        <TabItem
          value="info"
          icon={<InfoCircle />}
          label="Info"
          className={clsx(
            'flex-1 text-center py-2',
            clickedTab === 'info' && 'flash-on-click'
          )}
        />
        <TabItem
          value="profile"
          icon={<User />}
          label="Profile"
          className={clsx(
            'flex-1 text-center py-2',
            clickedTab === 'profile' && 'flash-on-click'
          )}
        />
      </Tabs>
    </div>
  );
};