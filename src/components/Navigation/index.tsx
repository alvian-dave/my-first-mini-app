'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';
import { useRef } from 'react';

export const Navigation = () => {
  const pathname = usePathname();        
  const router = useRouter();

  const currentTab = pathname.split('/')[1] || 'home';
  const lastTab = useRef(currentTab); // 🧠 Simpan tab terakhir yang benar-benar di-klik

  const handleTabChange = (nextTab: string) => {
    // ✅ Abaikan jika tab sama persis
    if (nextTab === lastTab.current) return;

    // 🧠 Simpan tab baru & navigasi
    lastTab.current = nextTab;
    router.push(`/${nextTab}`);
  };

  return (
    <Tabs
      value={currentTab}
      // ⛔️ Bugfix: beberapa versi Tabs tetap trigger onValueChange meskipun value sama
      onValueChange={(tab) => {
        if (tab !== currentTab) handleTabChange(tab);
      }}
      className="h-full flex items-center !mt-0"
    >
      <TabItem value="home" icon={<Home />} label="Home" />
      <TabItem value="info" icon={<InfoCircle />} label="Info" />
      <TabItem value="profile" icon={<User />} label="Profile" />
    </Tabs>
  );
};