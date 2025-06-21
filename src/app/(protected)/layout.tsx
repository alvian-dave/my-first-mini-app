import { auth } from '@/auth';
import { redirect } from 'next/navigation'; // ✅ tambahkan ini
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // ✅ Jika user belum login, langsung redirect ke halaman root
  if (!session) {
    redirect('/'); // ✅ penting untuk cegah popup MiniKit muncul ulang
  }

  return (
    <Page>
      {children}
      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}