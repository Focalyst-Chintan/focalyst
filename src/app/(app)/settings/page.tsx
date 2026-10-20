'use client';

import React from 'react';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import DesktopSettingsView from '@/components/desktop/settings/DesktopSettingsView';
import AccountPage from '../account/page';

export default function SettingsPage() {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return <DesktopSettingsView />;
  }

  return <AccountPage />;
}
