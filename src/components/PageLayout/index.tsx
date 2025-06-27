import clsx from 'clsx';
import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * This component is a simple page layout component to help with design consistency
 * Feel free to modify this component to fit your needs
 */
export const Page = (props: { children: ReactNode; className?: string }) => {
  return (
    <div className={twMerge(clsx('flex h-dvh flex-col', props.className))}>
      {props.children}
    </div>
  );
};

const Header = (props: { children: ReactNode; className?: string }) => {
  return (
    <header
      className={twMerge(
        'bg-black text-white flex flex-col justify-center px-6 pt-6 pb-3 z-10',
        clsx(props.className),
      )}
    >
      {props.children}
    </header>
  );
};

const Main = (props: { children: ReactNode; className?: string }) => {
  return (
    <main
      className={twMerge(
        clsx(
          'relative grow overflow-y-auto p-6 pt-3',
          'bg-[#0f172a]',
          props.className,
        )
      )}
    >
      {/* Dynamic glow aura */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse pointer-events-none z-0" />

      {/* Subtle animated light streak */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-[-100px] w-[200%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent animate-slide" />
      </div>

      {/* Content */}
      <div className="relative z-10">{props.children}</div>
    </main>
  );
};

const Footer = (props: { children: ReactNode; className?: string }) => {
  return (
    <footer
      className={twMerge(
        'h-[70px] px-6 pb-[10px] flex items-center justify-center',
        clsx(props.className)
      )}
    >
      {props.children}
    </footer>
  );
};

Page.Header = Header;
Page.Main = Main;
Page.Footer = Footer;