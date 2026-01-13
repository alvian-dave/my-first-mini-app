"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, BarChart3, BookOpen, Wallet, PieChart } from 'lucide-react';

interface NavbarProps {
  role: 'hunter' | 'promoter';
}

const NavbarBottom: React.FC<NavbarProps> = ({ role }) => {
  const pathname = usePathname();
  const isPromoter = role === 'promoter';
  const basePath = isPromoter ? '/dashboard/promoter' : '/dashboard/hunter';

  const menuConfig = isPromoter 
    ? {
        left: { name: 'FINANCE', icon: <Wallet size={20} />, path: `${basePath}/finance` },
        right: { name: 'ANALYTICS', icon: <PieChart size={20} />, path: `${basePath}/analytics` }
      }
    : {
        left: { name: 'RANK', icon: <Trophy size={20} />, path: `${basePath}/leaderboard` },
        right: { name: 'STATS', icon: <BarChart3 size={20} />, path: `${basePath}/stats` }
      };

  const finalMenus = [
    menuConfig.left,
    // FIX: Sekarang mengarah ke /dashboard/hunter/how-to-start atau /dashboard/promoter/how-to-start
    { name: 'START', icon: <BookOpen size={20} />, path: `${basePath}/how-to-start` }, 
    menuConfig.right
  ];

  // WARNA: Green-400 untuk Hunter, Blue-400 untuk Promoter
  const activeColorClass = isPromoter ? 'text-blue-400' : 'text-emerald-400';
  
  // GLOW: Diperkuat cahayanya (opacity 0.6) dan Inner Glow lebih tajam
  const glowClass = isPromoter 
    ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.4),inset_0_0_15px_rgba(59,130,246,0.2)]' 
    : 'border-emerald-500/50 shadow-[0_0_30px_rgba(34,197,94,0.4),inset_0_0_15px_rgba(34,197,94,0.2)]';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-6 pb-8 pointer-events-none">
      <div 
        className={`
          mx-auto max-w-sm bg-slate-950/95 backdrop-blur-2xl 
          border rounded-[24px] flex justify-around items-center h-16 
          transition-all duration-300 pointer-events-auto
          ${glowClass}
        `}
      >
        {finalMenus.map((item, index) => {
          const isActive = pathname === item.path;
          
          return (
            <Link 
              key={index} 
              href={item.path}
              className="flex flex-col items-center justify-center w-full h-full relative group"
            >
              <div className={`
                transition-all duration-300 active:scale-90
                ${isActive ? `${activeColorClass} scale-110 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]` : 'text-slate-500 group-hover:text-slate-300'}
              `}>
                {item.icon}
              </div>

              <span className={`
                text-[9px] font-black mt-1 tracking-[0.15em] transition-all duration-300
                ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'}
              `}>
                {item.name}
              </span>
              
              {isActive && (
                <div className={`
                  absolute -bottom-1 w-1.5 h-1.5 rounded-full animate-pulse
                  ${isPromoter ? 'bg-blue-400 shadow-[0_0_10px_#3b82f6]' : 'bg-emerald-400 shadow-[0_0_10px_#22c55e]'}
                `} />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default NavbarBottom;