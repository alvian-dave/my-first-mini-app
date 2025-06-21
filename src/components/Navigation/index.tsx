'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';
import { useRef } from 'react';

export const Navigation = () => {
  const pathname = usePathname(); // misalnya: "/info"
  const router = useRouter();
  const lastPath = useRef(pathname); // simpan path terakhir

  const currentTab = pathname.split('/')[1] || 'home';

  const handleTabChange = (nextTab: string) => {
    const targetPath = `/${nextTab}`;

    if (lastPath.current === targetPath) {
      // ⛔ Jika path-nya sama, jangan lakukan apa pun
      return;
    }

    lastPath.current = targetPath;
    router.push(targetPath); // ✅ Hanya push jika path berbeda
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