'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Flame, GripVertical, Plus, Trash2, Edit3, Check } from 'lucide-react';
import { usePlan, HabitItem } from '@/context/PlanContext';
import { useDesktopShell } from '@/components/desktop/DesktopShellContext';
import { useCreate } from '@/components/desktop/create/CreateProvider';
import { EmptyState } from '@/components/desktop/ui/EmptyState';
import { Button } from '@/components/desktop/ui/Button';
import { Modal } from '@/components/desktop/ui/Modal';
import { CalendarHeatmap } from './CalendarHeatmap';
import { localDateStr, addDaysYMD } from '@/lib/utils/date';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { onDataChanged } from '@/lib/events';
import { AccountabilitySection } from './AccountabilitySection';

export function HabitsView() {
  const { habits, loading, error, refreshData, updateHabit, deleteHabit } = usePlan();
  const { setContextPanel, isContextPanelOpen, setIsContextPanelOpen } = useDesktopShell();
  const { open: openCreate } = useCreate();
  const { user } = useAuth();
  const supabase = createClient();

  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [habitLogs, setHabitLogs] = useState<{ completed_date: string; habit_id: string }[]>([]);
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());

  const todayStr = useMemo(() => localDateStr(new Date()), []);

  // Fetch all habit logs for streak computations and heatmaps
  const fetchLogs = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('habit_logs')
        .select('completed_date, habit_id')
        .eq('user_id', user.id);
      setHabitLogs(data || []);
    } catch (err) {
      console.error('Error fetching habit logs:', err);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchLogs();
    const unsub = onDataChanged(['habit'], () => {
      fetchLogs();
    });
    const handleFocus = () => fetchLogs();
    window.addEventListener('focus', handleFocus);
    return () => {
      unsub();
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchLogs]);

  // Last 7 days dates ending today (oldest left)
  const last7Days = useMemo(() => {
    const list: string[] = [];
    for (let i = 6; i >= 0; i--) {
      list.push(addDaysYMD(todayStr, -i));
    }
    return list;
  }, [todayStr]);

  // The habit the details panel describes. Nothing is selected by default; the
  // first habit only backs the panel content so ⌘ . has something to open.
  // The panel itself opens only on a habit click or ⌘ .
  const selectedHabit = useMemo(() => {
    if (!habits || habits.length === 0) return null;
    return habits.find((h) => h.id === selectedHabitId) || habits[0];
  }, [habits, selectedHabitId]);

  // Stats computed from habit_logs for selected habit
  const habitStats = useMemo(() => {
    if (!selectedHabit) {
      return { currentStreak: 0, bestStreak: 0, completionPct: 0 };
    }

    const currentStreak = selectedHabit.current_streak || 0;

    // Filter logs for this habit
    const thisHabitLogs = new Set(
      habitLogs.filter((l) => l.habit_id === selectedHabit.id).map((l) => l.completed_date)
    );

    // Also include completedDates on habit
    if (selectedHabit.completedDates) {
      selectedHabit.completedDates.forEach((d) => thisHabitLogs.add(d));
    }
    if (selectedHabit.completed_today) {
      thisHabitLogs.add(todayStr);
    }

    // Sort unique log dates
    const sortedDates = Array.from(thisHabitLogs).sort();

    // Compute best streak
    let bestStreak = currentStreak;
    let tempStreak = 0;
    let prevDate: string | null = null;

    for (const dStr of sortedDates) {
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const expectedNext = addDaysYMD(prevDate, 1);
        if (dStr === expectedNext) {
          tempStreak += 1;
        } else if (dStr !== prevDate) {
          tempStreak = 1;
        }
      }
      prevDate = dStr;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    }

    // Completion % since start date
    const startDate = selectedHabit.start_date || selectedHabit.created_at?.slice(0, 10) || todayStr;
    const sDate = new Date(startDate);
    const eDate = new Date(todayStr);
    const diffDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const completionPct = Math.min(100, Math.round((thisHabitLogs.size / diffDays) * 100));

    return {
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
      completionPct,
    };
  }, [selectedHabit, habitLogs, todayStr]);

  // Update Context Panel when selected habit changes
  useEffect(() => {
    if (!selectedHabit) {
      setContextPanel(null);
      return;
    }

    const scheduleText = selectedHabit.all_days
      ? 'Every day'
      : selectedHabit.repeat_days && selectedHabit.repeat_days.length > 0
      ? selectedHabit.repeat_days
          .map((d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d] || 'Day')
          .join(', ')
      : 'Every day';

    const reminderText = selectedHabit.reminders && selectedHabit.reminder_time
      ? ` • ${selectedHabit.reminder_time.slice(0, 5)}`
      : '';

    const singleHabitLogs = habitLogs.filter((l) => l.habit_id === selectedHabit.id);

    setContextPanel(
      <div className="flex flex-col gap-6">
        {/* Habit Header */}
        <div className="flex items-center gap-3.5">
          <div
            className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[22px] shrink-0"
            style={{ backgroundColor: `${selectedHabit.color || '#1951FC'}24` }}
          >
            {selectedHabit.icon || '🎯'}
          </div>
          <div className="min-w-0">
            <h2 className="text-[20px] font-semibold text-ink truncate leading-tight">
              {selectedHabit.name}
            </h2>
            <p className="text-[13px] text-ink-2 mt-0.5 truncate">
              {scheduleText}
              {reminderText}
            </p>
          </div>
        </div>

        {/* 3 Stat Tiles (bg-surface-2, radius 14, padding 12) */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-[14px] bg-surface-2 p-3 text-center">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3 block mb-1">
              Streak
            </span>
            <span className="text-[20px] font-semibold tabular-nums text-ink block">
              {habitStats.currentStreak}d
            </span>
          </div>
          <div className="rounded-[14px] bg-surface-2 p-3 text-center">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3 block mb-1">
              Best
            </span>
            <span className="text-[20px] font-semibold tabular-nums text-ink block">
              {habitStats.bestStreak}d
            </span>
          </div>
          <div className="rounded-[14px] bg-surface-2 p-3 text-center">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3 block mb-1">
              Rate
            </span>
            <span className="text-[20px] font-semibold tabular-nums text-ink block">
              {habitStats.completionPct}%
            </span>
          </div>
        </div>

        {/* Full-Year Calendar Heatmap */}
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3 block mb-2">
            Consistency
          </span>
          <CalendarHeatmap
            logs={singleHabitLogs}
            color={selectedHabit.color || '#1951FC'}
            year={heatmapYear}
            onYearChange={setHeatmapYear}
            createdAt={selectedHabit.created_at}
            singleHabit
          />
        </div>

        {/* Action Buttons: Edit + Delete */}
        <div className="flex items-center gap-2 pt-2 border-t border-line">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openCreate('habit', { initialData: selectedHabit })}
            className="flex-1 gap-1.5"
          >
            <Edit3 size={14} />
            <span>Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              deleteHabit(selectedHabit.id);
              setSelectedHabitId(null);
              setIsContextPanelOpen(false);
            }}
            className="text-danger hover:bg-danger/10 gap-1.5"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </Button>
        </div>
      </div>
    );
  }, [
    selectedHabit,
    habitLogs,
    habitStats,
    heatmapYear,
    setContextPanel,
    openCreate,
    deleteHabit,
  ]);

  if (error) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-[20px] frost">
          <p className="text-[14px] text-ink mb-3">{error || "Couldn't load habits."}</p>
          <Button variant="secondary" size="sm" onClick={() => refreshData()}>
            Retry
          </Button>
        </div>
        <AccountabilitySection />
      </div>
    );
  }

  if (loading && (!habits || habits.length === 0)) {
    return (
      <div className="flex flex-col gap-3 w-full animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-[16px] bg-surface-2/60 border border-line" />
        ))}
      </div>
    );
  }

  if (!habits || habits.length === 0) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="py-12">
          <EmptyState
            title="No habits yet."
            description="Small, repeatable actions build the life you want."
            actionLabel="Create your first habit"
            onAction={() => openCreate('habit')}
          />
        </div>
        <AccountabilitySection />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {habits.map((habit) => {
        // Selection only shows while the panel is open; closing it (X, Esc, ⌘ .) clears it
        const isSelected = isContextPanelOpen && selectedHabit?.id === habit.id;
        const habitColor = habit.color || '#1951FC';

        const scheduleLabel = habit.all_days
          ? 'Every day'
          : habit.repeat_days && habit.repeat_days.length > 0
          ? habit.repeat_days
              .map((d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d] || '')
              .join(', ')
          : 'Every day';

        // Check is scheduled for given date
        const isScheduledForDate = (dateYMD: string) => {
          if (habit.all_days) return true;
          if (!habit.repeat_days || habit.repeat_days.length === 0) return true;
          const d = new Date(dateYMD);
          const jsDay = d.getDay();
          const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
          return habit.repeat_days.includes(dayIdx);
        };

        const isDoneOnDate = (dateYMD: string) => {
          if (dateYMD === todayStr) return Boolean(habit.completed_today);
          if (habit.completedDates && habit.completedDates.includes(dateYMD)) return true;
          return habitLogs.some((l) => l.habit_id === habit.id && l.completed_date === dateYMD);
        };

        const hasPosition = typeof habit.position === 'number';

        return (
          <div
            key={habit.id}
            onClick={() => {
              setSelectedHabitId(habit.id);
              setIsContextPanelOpen(true);
            }}
            className={`group relative h-16 rounded-[16px] frost pl-4 pr-4 flex items-center gap-3.5 cursor-pointer transition-all duration-150 hover:-translate-y-px hover:border-line-strong ${
              isSelected ? 'border-primary/40 shadow-sm' : ''
            }`}
          >
            {/* Absolute Grip handle at left 4px, visible only on hover */}
            <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-ink-3 pointer-events-none">
              <GripVertical size={16} />
            </div>

            {/* Icon Chip 36px, radius 12, bg = habit colour at 14% */}
            <div
              className="w-9 h-9 rounded-[12px] flex items-center justify-center text-[17px] shrink-0"
              style={{ backgroundColor: `${habitColor}24` }}
            >
              {habit.icon || '🎯'}
            </div>

            {/* Text block: name + schedule */}
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-ink truncate leading-tight">
                {habit.name}
              </div>
              <div className="text-[12px] text-ink-3 truncate leading-normal mt-0.5">
                {scheduleLabel}
              </div>
            </div>

            {/* Last-7-days dots (oldest left): 12px circles, gap 6 */}
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {last7Days.map((dStr) => {
                const isToday = dStr === todayStr;
                const done = isDoneOnDate(dStr);
                const scheduled = isScheduledForDate(dStr);

                let dotStyle: React.CSSProperties = {};
                let dotClass = 'h-3 w-3 rounded-full transition-all';

                if (done) {
                  dotStyle = { backgroundColor: habitColor };
                } else if (scheduled) {
                  dotClass += ' border-[1.5px] border-line-strong bg-transparent';
                } else {
                  dotClass += ' bg-surface-2';
                }

                if (isToday) {
                  return (
                    <button
                      key={dStr}
                      type="button"
                      title={done ? 'Today · Done (click to toggle)' : 'Today · Not done (click to toggle)'}
                      onClick={() =>
                        updateHabit(habit.id, { completed_today: !habit.completed_today })
                      }
                      style={{
                        ...dotStyle,
                        boxShadow: `0 0 0 2px var(--canvas), 0 0 0 4px ${habitColor}`,
                      }}
                      className={`${dotClass} cursor-pointer hover:scale-110`}
                    />
                  );
                }

                return (
                  <div
                    key={dStr}
                    title={dStr}
                    style={dotStyle}
                    className={dotClass}
                  />
                );
              })}
            </div>

            {/* Streak right: Flame 14 + number */}
            <div className="flex items-center gap-1 text-[13px] font-medium tabular-nums text-ink-2 shrink-0 ml-2">
              <Flame size={14} className="text-warning fill-warning" />
              <span>{habit.current_streak || 0}</span>
            </div>
          </div>
        );
      })}

      {/* Accountability Section */}
      <AccountabilitySection />
    </div>
  );
}

export default HabitsView;
