'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, User } from 'iconoir-react';
import { useState } from 'react';

/**
 * This component uses the UI Kit to navigate between pages
 * Bottom navigation is the most common navigation pattern in Mini Apps
 * We require mobile first design patterns for mini apps
 * Read More: https://docs.world.org/mini-apps/design/app-guidelines#mobile-first
 */

export const Navigation = () => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div> {/* Bungkus semua elemen di dalam satu <div> */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabItem value="home" icon={<Home />} label="Home" />
        <TabItem value="info" icon={<InfoCircle />} label="Info" />
        <TabItem value="profile" icon={<User />} label="Profile" />
      </Tabs>

      {/* Konten berdasarkan tab */}
      <div className="mt-4 px-4">
        {activeTab === 'home' && <p>Ini halaman Home.</p>}
        {activeTab === 'info' && <p>Ini halaman Info.</p>}
        {activeTab === 'profile' && <p>Ini halaman Profil.</p>}
      </div>
    </div>
  );
};
