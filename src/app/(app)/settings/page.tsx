'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import DesktopSettingsView from '@/components/desktop/settings/DesktopSettingsView';
import ConnectionsSection from '@/components/desktop/settings/connections/ConnectionsSection';
import AccountPage from '../account/page';

function SettingsRouter() {
  const isDesktop = useIsDesktop();
  const searchParams = useSearchParams();

  if (isDesktop) {
    return <DesktopSettingsView />;
  }

  // Phones and tablets under 1024px: AI connections is its own page, one column, full width
  if (isDesktop === false && searchParams.get('tab') === 'connections') {
    return (
      <div className="w-full max-w-full overflow-x-hidden px-4 pt-6 pb-10 sm:px-6">
        <Link
          href="/account"
          className="mb-5 inline-flex items-center gap-1 text-[14px] font-medium text-navy dark:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
          Account
        </Link>
        <ConnectionsSection />
      </div>
    );
  }

  return <AccountPage />;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsRouter />
    </Suspense>
  );
}
