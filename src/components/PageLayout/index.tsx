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

const Main = (props: { children: React.ReactNode; className?: string }) => {
  const colors = ['#ff4d4d', '#4dd0ff', '#7cff4d', '#ffd24d', '#d44dff']; // neon colors

  return (
    <main
      className={twMerge(
        clsx(
          'relative grow overflow-y-auto p-6 pt-3 bg-neutral-900 text-white',
          props.className
        )
      )}
    >
      {/* Falling particles */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => {
          const left = `${Math.random() * 100}%`;
          const delay = `${Math.random() * 5}s`;
          const duration = `${2 + Math.random() * 3}s`;
          const top = `${-Math.random() * 100}px`;
          const color = colors[Math.floor(Math.random() * colors.length)];

          return (
            <span
              key={i}
              className="absolute w-[4px] h-[16px] opacity-100 rounded mix-blend-overlay"
              style={{
                left,
                top,
                backgroundColor: color,
                filter: `drop-shadow(0 0 8px ${color})`,
                animation: `fall ${duration} linear ${delay} infinite`,
              }}
            />
          );
        })}
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
        'h-[70px] px-6 pb-[10px] flex items-center justify-center bg-neutral-900 text-white border-t border-neutral-800',
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