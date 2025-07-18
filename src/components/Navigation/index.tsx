'use client';

import { Home, InfoCircle, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

const TABS = [
  { label: 'Home', value: 'home', icon: <Home /> },
  { label: 'Info', value: 'info', icon: <InfoCircle /> },
  { label: 'Profile', value: 'profile', icon: <User /> },
];

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const currentTab = pathname.split('/')[1] || 'home';

  const [clickedTab, setClickedTab] = useState<string | null>(null);

  const handleClick = (tab: string) => {
    if (tab === currentTab) {
      setClickedTab(tab);
      return;
    }
    router.push(`/${tab}`);
  };

  useEffect(() => {
    if (clickedTab) {
      const timeout = setTimeout(() => setClickedTab(null), 400);
      return () => clearTimeout(timeout);
    }
  }, [clickedTab]);

  return (
    <div className="w-full border-t border-border bg-white">
      <div className="flex w-full">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleClick(tab.value)}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-sm font-medium transition-all',
              currentTab === tab.value && 'text-primary',
              clickedTab === tab.value && 'flash-on-click'
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};