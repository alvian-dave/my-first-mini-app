'use client';

import { useState } from 'react';
import { Tabs, TabItem } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';

export const Navigation = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'info' | 'profile'>('home');

  return (
    <div className="flex flex-col gap-4">
      {/* Tab Navigasi */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabItem value="home" icon={<Home />} label="Home" />
        <TabItem value="info" icon={<InfoCircle />} label="Info" />
        <TabItem value="profile" icon={<User />} label="Profile" />
      </Tabs>
    </div>
  );
};
