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
          'bg-gradient-to-br from-blue-300 via-blue-100 to-white',
          props.className,
        )
      )}
    >
      {/* Falling particles */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <span
            key={i}
            className="absolute w-[2px] h-[8px] bg-blue-400 opacity-20 animate-fall rounded"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              top: `${-Math.random() * 100}px`,
              filter: `blur(${Math.random() * 2 + 0.5}px)`,
            }}
          />
        ))}
      </div>

      {/* Content layer */}
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