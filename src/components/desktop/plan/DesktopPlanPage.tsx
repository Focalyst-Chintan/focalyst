'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { usePlan } from '@/context/PlanContext';
import { useDesktopShell } from '@/components/desktop/DesktopShellContext';
import { useCreate } from '@/components/desktop/create/CreateProvider';
import { SegmentedControl } from '@/components/desktop/ui/SegmentedControl';
import { Button } from '@/components/desktop/ui/Button';
import { HabitsView } from '@/components/desktop/plan/HabitsView';
import { TasksView } from '@/components/desktop/plan/TasksView';
import { CalendarDesktopView } from '@/components/desktop/plan/CalendarDesktopView';

export function DesktopPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { habits, tasks } = usePlan();
  const { open: openCreate } = useCreate();

  const currentView = searchParams.get('view') || 'habits';

  const habitsCount = habits?.length || 0;
  const tasksCount = useMemo(() => {
    return (tasks || []).filter((t) => !t.is_completed).length;
  }, [tasks]);

  const setView = (v: string) => {
    router.push(`/plan?view=${v}`);
  };

  const handleHeaderAction = () => {
    if (currentView === 'habits') {
      openCreate('habit');
    } else if (currentView === 'tasks') {
      openCreate('task');
    } else if (currentView === 'calendar') {
      openCreate('reminder');
    }
  };

  const actionButtonText =
    currentView === 'tasks'
      ? '+ New task'
      : currentView === 'calendar'
      ? '+ New reminder'
      : '+ New habit';

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header row, mb 24 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-6">
          <h1 className="font-display text-[32px]/[38px] text-ink font-normal">Plan</h1>
          <SegmentedControl
            value={currentView}
            onChange={setView}
            options={[
              { label: `Habits ${habitsCount}`, value: 'habits' },
              { label: `Tasks ${tasksCount}`, value: 'tasks' },
              { label: 'Calendar', value: 'calendar' },
            ]}
          />
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleHeaderAction}
          className="gap-1.5 shadow-[var(--shadow-1)]"
        >
          <span>{actionButtonText}</span>
        </Button>
      </div>

      {/* Main View Render */}
      <div className="w-full">
        {currentView === 'tasks' && <TasksView />}
        {currentView === 'calendar' && <CalendarDesktopView />}
        {currentView !== 'tasks' && currentView !== 'calendar' && <HabitsView />}
      </div>
    </div>
  );
}

export default DesktopPlanPage;
