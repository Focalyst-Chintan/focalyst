'use client';

import React from 'react';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import DesktopGroupsView from '@/components/desktop/groups/DesktopGroupsView';
import HabitGroupLeaderboardSection from '@/components/insights/HabitGroupLeaderboardSection';
import { usePlan } from '@/context/PlanContext';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/desktop/ui/Skeleton';

export default function GroupsPage() {
  const isDesktop = useIsDesktop();
  const { habits } = usePlan();
  const { user } = useAuth();

  if (isDesktop === null) {
    return (
      <div className="p-6">
        <Skeleton className="h-[calc(100vh-140px)] w-full rounded-[20px]" />
      </div>
    );
  }

  if (isDesktop) {
    return <DesktopGroupsView />;
  }

  // Mobile fallback (< 1024px)
  return (
    <div className="min-h-screen bg-page-bg dark:bg-slate-950 p-4 pb-32">
      <HabitGroupLeaderboardSection
        activeHabits={habits}
        userId={user?.id}
      />
    </div>
  );
}
