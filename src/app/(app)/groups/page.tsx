'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import DesktopGroupsView from '@/components/desktop/groups/DesktopGroupsView';
import HabitGroupLeaderboardSection from '@/components/insights/HabitGroupLeaderboardSection';
import { usePlan } from '@/context/PlanContext';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/desktop/ui/Skeleton';

export default function GroupsPage() {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const { habits } = usePlan();
  const { user } = useAuth();

  useEffect(() => {
    if (isDesktop) {
      router.replace('/plan?view=habits#accountability');
    }
  }, [isDesktop, router]);

  if (isDesktop === null) {
    return (
      <div className="p-6">
        <Skeleton className="h-[calc(100vh-140px)] w-full rounded-[20px]" />
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div className="p-6 max-w-[1280px] mx-auto space-y-6">
        <Skeleton className="h-10 w-64 rounded-[12px]" />
        <Skeleton className="h-64 w-full rounded-[24px]" />
      </div>
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
