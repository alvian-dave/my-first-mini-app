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
      {/* Animated Glow Orb */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-transparent rounded-full blur-[140px] animate-pulse pointer-events-none z-0" />

      {/* Futuristic grid pattern */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(transparent 95%, rgba(255,255,255,0.03) 95%),
            linear-gradient(90deg, transparent 95%, rgba(255,255,255,0.03) 95%)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Subtle shimmer overlay (no noise.svg needed) */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-white/5 via-transparent to-white/5 mix-blend-overlay opacity-10 animate-[pulse_8s_ease-in-out_infinite]" />

      {/* Actual content */}
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