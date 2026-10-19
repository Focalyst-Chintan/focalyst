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
    return (
      <React.Suspense
        fallback={
          <div className="grid grid-cols-[320px_1fr] gap-5 items-start max-w-[1280px] mx-auto">
            <div className="frost rounded-[20px] p-4 space-y-3">
              <Skeleton className="h-9 w-full rounded-[10px]" />
              <Skeleton className="h-20 w-full rounded-[16px]" />
            </div>
            <div className="frost rounded-[28px] p-7 space-y-6">
              <Skeleton className="h-10 w-64 rounded-[12px]" />
              <Skeleton className="h-44 w-full rounded-[20px]" />
            </div>
          </div>
        }
      >
        <DesktopGroupsView />
      </React.Suspense>
    );
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
