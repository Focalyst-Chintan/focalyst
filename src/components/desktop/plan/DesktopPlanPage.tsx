'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, PanelRight } from 'lucide-react';
import { usePlan } from '@/context/PlanContext';
import { useDesktopShell } from '@/components/desktop/DesktopShellContext';
import { useCreate } from '@/components/desktop/create/CreateProvider';
import { SegmentedControl } from '@/components/desktop/ui/SegmentedControl';
import { Button } from '@/components/desktop/ui/Button';
import { IconButton } from '@/components/desktop/ui/IconButton';
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

  const { isContextPanelOpen, setIsContextPanelOpen, toggleContextPanel } = useDesktopShell();

  // The details panel starts closed when Plan opens and on every switch between
  // Habits, Tasks and Calendar. It opens only on purpose: clicking a habit, a
  // task or a day, or ⌘ . (layout effect, so it closes before the views fill it).
  React.useLayoutEffect(() => {
    setIsContextPanelOpen(false);
  }, [currentView, setIsContextPanelOpen]);

  // Remember the last open or close, whichever way it happened (X, Esc, ⌘ .)
  const prevPanelOpen = React.useRef(isContextPanelOpen);
  React.useEffect(() => {
    if (prevPanelOpen.current === isContextPanelOpen) return;
    prevPanelOpen.current = isContextPanelOpen;
    try {
      localStorage.setItem('plan:detailsOpen', isContextPanelOpen ? '1' : '0');
    } catch {}
  }, [isContextPanelOpen]);

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
              { label: 'Habits', value: 'habits', count: habitsCount },
              { label: 'Tasks', value: 'tasks', count: tasksCount },
              { label: 'Calendar', value: 'calendar' },
            ]}
          />
        </div>

        <div className="flex items-center gap-3">
          <IconButton
            label={isContextPanelOpen ? 'Hide details' : 'Show details'}
            tooltip={isContextPanelOpen ? 'Hide details ⌘.' : 'Show details ⌘.'}
            size="md"
            variant="ghost"
            onClick={toggleContextPanel}
          >
            <PanelRight size={18} />
          </IconButton>

          <Button
            variant="primary"
            size="md"
            onClick={handleHeaderAction}
            className="gap-1.5 shadow-[var(--shadow-1)]"
          >
            <span>{actionButtonText}</span>
          </Button>
        </div>
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
