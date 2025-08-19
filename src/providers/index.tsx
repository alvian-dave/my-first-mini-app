'use client';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { Session } from 'next-auth';
import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface ClientProvidersProps {
  children: ReactNode;
  session: Session | null;
}

/**
 * Komponen kecil buat simpan & restore session dari localStorage
 */
function SessionPersist() {
  const { data: session } = useSession();

  // simpan session ke localStorage tiap kali berubah
  useEffect(() => {
    if (session) {
      localStorage.setItem('session', JSON.stringify(session));
    }
  }, [session]);

  // restore session dari localStorage (opsional kalau mau merge manual)
  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (stored && !session) {
      // bisa dipakai kalau mau manual inject ke state
      console.log("🔄 Restored session dari localStorage:", JSON.parse(stored));
    }
  }, []);

  return null; // gak render apapun
}

/**
 * ClientProvider wraps the app with essential context providers.
 */
export default function ClientProviders({
  children,
  session,
}: ClientProvidersProps) {
  return (
    <MiniKitProvider>
      <SessionProvider session={session}>
        <SessionPersist /> {/* ✅ Tambahin persist logic */}
        {children}
      </SessionProvider>
    </MiniKitProvider>
  );
}
