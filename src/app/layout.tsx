import { auth } from '@/auth';
import ClientProviders from '@/providers';
import { Toaster } from "@/components/ui/sonner"
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'World Reward Coin',
  description: 'Coin for every human on Earth',
  icons: {
    icon: '/favicon.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div id="app-scroll" className="app-scroll overflow-y-auto">
          <ClientProviders session={session}>
            {children}
            <Toaster richColors closeButton position="top-center" />
            </ClientProviders>
        </div>
      </body>
    </html>
  );
}
