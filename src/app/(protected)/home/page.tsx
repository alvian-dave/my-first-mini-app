'use client'
import { Page } from '@/components/PageLayout';
import {SelectRole} from '@/components/SelectRole';

export default function Home() {
  const router = useRouter()

  return (
    <Page>
    <Page.Main className="bg-transparent flex items-center justify-center">
    <div className="bg-gray-800/80 p-6 rounded-xl shadow-lg">
      <SelectRole />
    </div>
  </Page.Main>
  </Page>
  );
}