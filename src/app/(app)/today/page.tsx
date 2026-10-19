'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  ArrowUpRight,
  ArrowRight,
  Flame,
  AlertCircle,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { usePlan, TaskItem, HabitItem } from '@/context/PlanContext';
import { createClient } from '@/lib/supabase';
import { localDateStr } from '@/lib/utils/date';
import {
  getStartAndEndOfWeek,
  aggregateSessionsByDay,
} from '@/lib/utils/insights';
import { fetchMyGroupLeaderboard, GroupLeaderboardData } from '@/lib/services/habitGroupService';
import { getDisplayName, getFirstName } from '@/lib/utils/name';

// UI Kit components
import { Button } from '@/components/desktop/ui/Button';
import { Card } from '@/components/desktop/ui/Card';
import { ProgressRing } from '@/components/desktop/ui/ProgressRing';
import { Checkbox } from '@/components/desktop/ui/Checkbox';
import { Skeleton } from '@/components/desktop/ui/Skeleton';
import { EmptyState } from '@/components/desktop/ui/EmptyState';
import { Avatar } from '@/components/desktop/ui/Avatar';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { Kbd } from '@/components/desktop/ui/Kbd';

// 112px Analog Clock component specified in DESKTOP_DESIGN.md
function AnalogClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const sec = now ? now.getSeconds() * 6 : 0;
  const min = now ? (now.getMinutes() + now.getSeconds() / 60) * 6 : 0;
  const hr = now ? ((now.getHours() % 12) + now.getMinutes() / 60) * 30 : 0;

  return (
    <svg viewBox="0 0 120 120" className="mx-auto h-[112px] w-[112px]">
      <circle
        cx="60"
        cy="60"
        r="56"
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
      />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = 60 + Math.sin(angle) * 46;
        const y1 = 60 - Math.cos(angle) * 46;
        const x2 = 60 + Math.sin(angle) * 52;
        const y2 = 60 - Math.cos(angle) * 52;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--ink-3)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}
      <line
        x1="60"
        y1="60"
        x2="60"
        y2="30"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
        transform={`rotate(${hr} 60 60)`}
      />
      <line
        x1="60"
        y1="60"
        x2="60"
        y2="20"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
        transform={`rotate(${min} 60 60)`}
      />
      <line
        x1="60"
        y1="66"
        x2="60"
        y2="16"
        stroke="var(--primary-text)"
        strokeWidth="1.5"
        strokeLinecap="round"
        transform={`rotate(${sec} 60 60)`}
      />
      <circle cx="60" cy="60" r="3" fill="var(--primary-text)" />
    </svg>
  );
}

export default function TodayPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const {
    tasks,
    habits,
    reminders,
    addTask,
    updateTask,
    updateHabit,
    loading: planLoading,
  } = usePlan();
  const supabase = createClient();

  const [loadingFocus, setLoadingFocus] = useState(true);
  const [focusError, setFocusError] = useState(false);
  const [todayFocusMinutes, setTodayFocusMinutes] = useState(0);
  const [todaySessionsCount, setTodaySessionsCount] = useState(0);
  const [weeklyFocusActivities, setWeeklyFocusActivities] = useState<any[]>([]);
  const [weeklyFocusMinutes, setWeeklyFocusMinutes] = useState(0);
  const [lastWeekSamePeriodMinutes, setLastWeekSamePeriodMinutes] = useState(0);

  // Group data
  const [groupData, setGroupData] = useState<GroupLeaderboardData | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [groupError, setGroupError] = useState(false);

  // Heatmap logs & dynamic week measurement
  const [habitLogs, setHabitLogs] = useState<{ completed_date: string; habit_id: string }[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState(false);

  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const [heatmapWeeksCount, setHeatmapWeeksCount] = useState(20);

  useEffect(() => {
    const el = heatmapContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setHeatmapWeeksCount(Math.max(12, Math.min(53, Math.floor((w - 40 + 4) / 20))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Quick-add task input
  const [taskInput, setTaskInput] = useState('');

  const todayStr = useMemo(() => localDateStr(new Date()), []);

  // Fetch focus sessions & weekly metrics
  const fetchFocusMetrics = useCallback(async () => {
    if (!user) return;
    setLoadingFocus(true);
    setFocusError(false);

    try {
      const now = new Date();
      const { startOfWeek, endOfWeek } = getStartAndEndOfWeek(now);
      const startOfWeekStr = localDateStr(startOfWeek);
      const endOfWeekStr = localDateStr(endOfWeek);

      const lastWeekStart = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastWeekStartStr = localDateStr(lastWeekStart);

      // Last week's same weekday date:
      const lastWeekSameDay = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastWeekSameDayStr = localDateStr(lastWeekSameDay);

      // Fetch daily_focus_activity for this week and last week
      const { data: activities, error: actError } = await supabase
        .from('daily_focus_activity')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', lastWeekStartStr)
        .lte('date', endOfWeekStr);

      if (actError) throw actError;

      const actList: any[] = activities || [];
      const currentWeekList = actList.filter((a: any) => a.date >= startOfWeekStr && a.date <= endOfWeekStr);

      // Same days of last week (Mon..same weekday)
      const lastWeekSamePeriodList = actList.filter(
        (a: any) => a.date >= lastWeekStartStr && a.date <= lastWeekSameDayStr
      );

      const curMin = currentWeekList.reduce((acc: number, curr: any) => acc + (curr.focus_time_minutes || 0), 0);
      const lastWeekSameMin = lastWeekSamePeriodList.reduce(
        (acc: number, curr: any) => acc + (curr.focus_time_minutes || 0),
        0
      );

      const todayAct = actList.find((a: any) => a.date === todayStr);
      setTodayFocusMinutes(todayAct?.focus_time_minutes || 0);
      setTodaySessionsCount(todayAct?.sessions_completed || 0);

      setWeeklyFocusActivities(currentWeekList);
      setWeeklyFocusMinutes(curMin);
      setLastWeekSamePeriodMinutes(lastWeekSameMin);
    } catch (err) {
      console.error('Focus metrics error:', err);
      setFocusError(true);
    } finally {
      setLoadingFocus(false);
    }
  }, [user, supabase, todayStr]);

  // Fetch habit logs for heatmap (53 weeks max)
  const fetchHabitHeatmapLogs = useCallback(async () => {
    if (!user) return;
    setLoadingLogs(true);
    setLogsError(false);
    try {
      const pastYear = new Date();
      pastYear.setDate(pastYear.getDate() - 370);
      const startDateStr = localDateStr(pastYear);

      const { data, error } = await supabase
        .from('habit_logs')
        .select('completed_date, habit_id')
        .eq('user_id', user.id)
        .gte('completed_date', startDateStr);

      if (error) throw error;
      setHabitLogs(data || []);
    } catch (err) {
      console.error('Habit logs fetch error:', err);
      setLogsError(true);
    } finally {
      setLoadingLogs(false);
    }
  }, [user, supabase]);

  // Fetch group leaderboard
  const fetchGroup = useCallback(async () => {
    setLoadingGroup(true);
    setGroupError(false);
    try {
      const data = await fetchMyGroupLeaderboard();
      setGroupData(data);
    } catch (err) {
      console.error('Group fetch error:', err);
      setGroupError(true);
    } finally {
      setLoadingGroup(false);
    }
  }, []);

  useEffect(() => {
    fetchFocusMetrics();
    fetchHabitHeatmapLogs();
    fetchGroup();
  }, [fetchFocusMetrics, fetchHabitHeatmapLogs, fetchGroup]);

  // Greeting based on local hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, ';
    if (hour < 17) return 'Good afternoon, ';
    return 'Good evening, ';
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, []);

  const displayName = useMemo(() => getDisplayName(profile, user), [profile, user]);
  const firstName = useMemo(() => getFirstName(displayName), [displayName]);

  // Format focus time helper (e.g. 1h 24m or 45m)
  const formatFocusTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Scheduled habits for today
  // In our database / new-habit form: DAYS = ['M','T','W','T','F','S','S'] where Mon=0, Tue=1, ..., Sun=6
  // JS getDay(): Sun=0, Mon=1, ..., Sat=6. Map JS getDay to repeat_days index:
  const scheduledHabits = useMemo(() => {
    const jsDay = new Date().getDay();
    const habitDayIndex = jsDay === 0 ? 6 : jsDay - 1; // Mon=0, Sun=6

    return (habits || []).filter((h) => {
      if (h.all_days) return true;
      if (!h.repeat_days || h.repeat_days.length === 0) return true;
      return h.repeat_days.includes(habitDayIndex) || h.repeat_days.includes(jsDay);
    });
  }, [habits]);

  const completedHabitsCount = scheduledHabits.filter((h) => h.completed_today).length;
  const habitsProgress =
    scheduledHabits.length > 0
      ? Math.round((completedHabitsCount / scheduledHabits.length) * 100)
      : 0;

  // Up Next: Reminders or tasks scheduled for today
  const upcomingSchedule = useMemo(() => {
    const items: { time: string; title: string; color?: string }[] = [];
    (reminders || [])
      .filter((r) => r.date === todayStr)
      .forEach((r) => {
        items.push({
          time: r.start_time || 'All day',
          title: r.title,
          color: '#1951FC',
        });
      });

    return items.slice(0, 2);
  }, [reminders, todayStr]);

  // Tasks partitioned into Overdue and Today
  const { overdueTasks, todayTasks } = useMemo(() => {
    const overdue: TaskItem[] = [];
    const today: TaskItem[] = [];

    (tasks || []).forEach((t) => {
      if (t.is_completed) return;
      if (t.end_date && t.end_date < todayStr) {
        overdue.push(t);
      } else {
        today.push(t);
      }
    });

    return {
      overdueTasks: overdue.slice(0, 3),
      todayTasks: today.slice(0, 6),
    };
  }, [tasks, todayStr]);

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    addTask({
      title: taskInput.trim(),
      is_completed: false,
      start_date: todayStr,
      end_date: todayStr,
      tags: [],
      priority: 'medium',
      reminders: false,
    });
    setTaskInput('');
  };

  // Recharts weekly data
  const { startOfWeek, endOfWeek } = useMemo(() => getStartAndEndOfWeek(new Date()), []);
  const chartData = useMemo(() => {
    return aggregateSessionsByDay(weeklyFocusActivities, startOfWeek, endOfWeek);
  }, [weeklyFocusActivities, startOfWeek, endOfWeek]);

  // Delta chip comparison against same days of last week
  const deltaVsLastWeek = useMemo(() => {
    if (lastWeekSamePeriodMinutes === 0) return null;
    const diff = weeklyFocusMinutes - lastWeekSamePeriodMinutes;
    const pct = Math.round((diff / lastWeekSamePeriodMinutes) * 100);
    return pct;
  }, [weeklyFocusMinutes, lastWeekSamePeriodMinutes]);

  // Heatmap: dynamic calendar-aligned calculation ending with current week
  const { heatmapWeeks, heatmapMonthLabels } = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;

    // Start Monday (heatmapWeeksCount - 1) weeks ago
    const startMonday = new Date(now);
    startMonday.setDate(now.getDate() + mondayDiff - (heatmapWeeksCount - 1) * 7);

    // Group logs by date
    const logsByDate = new Map<string, number>();
    habitLogs.forEach((l) => {
      logsByDate.set(l.completed_date, (logsByDate.get(l.completed_date) || 0) + 1);
    });

    const activeHabitsCount = habits.length || 1;
    const weeks: { dateStr: string; ratio: number; dayOfWeek: number }[][] = [];
    const monthLabels: { key: string; label: string; col: number }[] = [];
    let lastLabeledCol = -999;

    let currentCursor = new Date(startMonday);
    for (let w = 0; w < heatmapWeeksCount; w++) {
      const daysInWeek = [];
      let containsFirstOfMonth: { label: string } | null = null;

      for (let d = 0; d < 7; d++) {
        const dStr = localDateStr(currentCursor);
        const count = logsByDate.get(dStr) || 0;
        const ratio = Math.min(1, count / activeHabitsCount);

        if (currentCursor.getDate() === 1) {
          containsFirstOfMonth = {
            label: currentCursor.toLocaleDateString('en-US', { month: 'short' }),
          };
        }

        daysInWeek.push({
          dateStr: dStr,
          ratio,
          dayOfWeek: d,
        });

        currentCursor.setDate(currentCursor.getDate() + 1);
      }

      if (containsFirstOfMonth) {
        if (w - lastLabeledCol >= 3) {
          monthLabels.push({
            key: `${containsFirstOfMonth.label}-${w}`,
            label: containsFirstOfMonth.label,
            col: w,
          });
          lastLabeledCol = w;
        }
      }

      weeks.push(daysInWeek);
    }
    return { heatmapWeeks: weeks, heatmapMonthLabels: monthLabels };
  }, [habitLogs, habits.length, heatmapWeeksCount]);

  // Deduplicated group members & user rank
  const { dedupedMembers, myRank, totalMembers, myMemberRecord, isCurrentUserInTop3 } =
    useMemo(() => {
      if (!groupData || !groupData.members) {
        return {
          dedupedMembers: [],
          myRank: null,
          totalMembers: 0,
          myMemberRecord: null,
          isCurrentUserInTop3: false,
        };
      }

      const map = new Map<string, any>();
      groupData.members.forEach((m) => {
        if (!map.has(m.user_id) || (m.streak || 0) > (map.get(m.user_id)?.streak || 0)) {
          map.set(m.user_id, m);
        }
      });

      const unique = Array.from(map.values()).sort((a, b) => (b.streak || 0) - (a.streak || 0));
      const myIndex = unique.findIndex((m) => m.user_id === user?.id || m.is_me);
      const myRecord = myIndex !== -1 ? unique[myIndex] : null;

      return {
        dedupedMembers: unique,
        myRank: myIndex !== -1 ? myIndex + 1 : null,
        totalMembers: unique.length,
        myMemberRecord: myRecord,
        isCurrentUserInTop3: myIndex !== -1 && myIndex < 3,
      };
    }, [groupData, user?.id]);

  const focusProgress = Math.min(100, Math.round((todayFocusMinutes / 180) * 100));

  return (
    <div className="w-full flex flex-col gap-7">
      {/* =========================================================================
          HEADER ROW
          ========================================================================= */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[44px]/[48px] tracking-[-0.015em] text-ink font-normal">
            {greeting}
            <span className="text-primary-text">{firstName}</span>
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-3">{formattedDate}</p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => router.push('/focus')}
          className="gap-2 shadow-[var(--shadow-1)]"
        >
          <Play className="h-4 w-4 fill-current" />
          <span>Start focus</span>
        </Button>
      </div>

      {/* =========================================================================
          BENTO GRID
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-5">
        {/* ================= ROW 1 ================= */}

        {/* Card 1: FOCUS HERO (xl:col-span-5) */}
        {loadingFocus ? (
          <Skeleton className="lg:col-span-2 xl:col-span-5 min-h-[240px] rounded-[20px]" />
        ) : focusError ? (
          <Card className="lg:col-span-2 xl:col-span-5 min-h-[240px] flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-8 h-8 text-danger mb-2" />
            <p className="text-[14px] text-ink mb-3">Couldn't load this.</p>
            <Button variant="secondary" size="sm" onClick={fetchFocusMetrics}>
              Retry
            </Button>
          </Card>
        ) : (
          <div
            className="lg:col-span-2 xl:col-span-5 min-h-[240px] rounded-[20px] p-6 relative overflow-hidden flex flex-col justify-between text-snow shadow-[var(--shadow-2)]"
            style={{
              background:
                'radial-gradient(120% 120% at 0% 100%, #1951FC 0%, #0B2CB1 40%, #03195B 100%)',
            }}
          >
            {/* Top/Middle Row */}
            <div className="flex items-center justify-between relative z-10">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-snow/70 block">
                  FOCUS TODAY
                </span>
                <div className="mt-2 text-[48px]/[52px] font-semibold tabular-nums tracking-[-0.02em] text-snow">
                  {formatFocusTime(todayFocusMinutes)}
                </div>
                <div className="mt-1 text-[13px] text-snow/70">of 3h goal</div>
              </div>

              <ProgressRing
                size={96}
                strokeWidth={8}
                progress={focusProgress}
                trackColor="rgba(242, 245, 255, 0.15)"
                color="#F2F5FF"
              >
                <span className="text-[13px] font-semibold tabular-nums text-snow/85">
                  {focusProgress}%
                </span>
              </ProgressRing>
            </div>

            {/* Bottom Row */}
            <div className="mt-6 flex items-center justify-between relative z-10">
              <Button
                variant="onDark"
                size="sm"
                onClick={() => router.push('/focus')}
              >
                Start session
              </Button>
              <span className="text-[13px] text-snow/70 tabular-nums font-medium">
                {todaySessionsCount} {todaySessionsCount === 1 ? 'session' : 'sessions'}
              </span>
            </div>
          </div>
        )}

        {/* Card 2: TODAY'S HABITS (xl:col-span-4) */}
        {planLoading ? (
          <Skeleton className="lg:col-span-1 xl:col-span-4 min-h-[240px] rounded-[20px]" />
        ) : (
          <Card className="lg:col-span-1 xl:col-span-4 min-h-[240px] flex flex-col justify-between p-6">
            {/* Header */}
            <div className="flex items-start justify-between min-h-8">
              <div>
                <h3 className="text-[16px] font-semibold text-ink">Habits</h3>
              </div>
              <div className="flex items-center gap-1.5 self-start">
                <span className="text-[13px] text-ink-3 tabular-nums font-medium">
                  {completedHabitsCount} of {scheduledHabits.length}
                </span>
                <IconButton
                  size="sm"
                  variant="ghost"
                  tooltip="View Habits"
                  className="self-start"
                  onClick={() => router.push('/plan?view=habits')}
                >
                  <ArrowUpRight className="w-4 h-4 text-ink-3" />
                </IconButton>
              </div>
            </div>

            {/* Habit List & Empty States */}
            <div className="flex-1 flex flex-col justify-start gap-1 mt-4">
              {habits.length === 0 ? (
                <EmptyState
                  title="Build your first habit."
                  actionLabel="Create habit"
                  onAction={() => router.push('/plan/new-habit')}
                />
              ) : scheduledHabits.length === 0 ? (
                <p className="text-[13px] text-ink-3 text-center py-4">
                  Nothing scheduled today.
                </p>
              ) : (
                scheduledHabits.slice(0, 6).map((habit) => (
                  <div
                    key={habit.id}
                    className="h-10 flex items-center justify-between px-1.5 rounded-[10px] hover:bg-surface-2/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Checkbox
                        checked={habit.completed_today}
                        onChange={() =>
                          updateHabit(habit.id, { completed_today: !habit.completed_today })
                        }
                      />
                      <div
                        className="w-6 h-6 rounded-[8px] flex items-center justify-center text-[12px] shrink-0"
                        style={{
                          backgroundColor: `${habit.color || '#1951FC'}24`,
                        }}
                      >
                        {habit.icon || '🎯'}
                      </div>
                      <span
                        className={`text-[14px] truncate ${
                          habit.completed_today ? 'text-ink-3 line-through' : 'text-ink'
                        }`}
                      >
                        {habit.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[13px] tabular-nums text-ink-2 shrink-0">
                      <Flame className="w-3.5 h-3.5 text-warning fill-warning" />
                      <span>{habit.current_streak || 0}</span>
                    </div>
                  </div>
                ))
              )}

              {scheduledHabits.length > 6 && (
                <button
                  type="button"
                  onClick={() => router.push('/plan?view=habits')}
                  className="text-[12px] text-primary-text font-medium text-left px-2 pt-1 hover:underline"
                >
                  +{scheduledHabits.length - 6} more
                </button>
              )}
            </div>

            {/* Bottom Progress Bar */}
            <div className="h-1 w-full rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${habitsProgress}%` }}
              />
            </div>
          </Card>
        )}

        {/* Card 3: UP NEXT (xl:col-span-3) */}
        {planLoading ? (
          <Skeleton className="lg:col-span-1 xl:col-span-3 min-h-[240px] rounded-[20px]" />
        ) : (
          <Card className="lg:col-span-1 xl:col-span-3 min-h-[240px] flex flex-col justify-between p-6">
            <div className="flex items-start justify-between min-h-8">
              <div>
                <h3 className="text-[16px] font-semibold text-ink">Up next</h3>
              </div>
              <IconButton
                size="sm"
                variant="ghost"
                tooltip="Calendar"
                className="self-start"
                onClick={() => router.push('/plan?view=calendar')}
              >
                <ArrowUpRight className="w-4 h-4 text-ink-3" />
              </IconButton>
            </div>

            {/* Centered 112px Analog Clock */}
            <div className="my-2">
              <AnalogClock />
            </div>

            {/* Next 2 scheduled items */}
            <div>
              {upcomingSchedule.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {upcomingSchedule.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-12 text-[12px] tabular-nums text-ink-3 shrink-0 font-medium">
                        {item.time}
                      </span>
                      <span className="text-[14px] text-ink truncate flex-1">
                        {item.title}
                      </span>
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color || '#1951FC' }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-ink-3 text-center">Nothing scheduled. Enjoy the space.</p>
              )}
            </div>
          </Card>
        )}

        {/* ================= ROW 2 ================= */}

        {/* Card 4: FOCUS THIS WEEK (xl:col-span-8) */}
        {loadingFocus ? (
          <Skeleton className="lg:col-span-2 xl:col-span-8 min-h-[320px] rounded-[20px]" />
        ) : focusError ? (
          <Card className="lg:col-span-2 xl:col-span-8 min-h-[320px] flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-8 h-8 text-danger mb-2" />
            <p className="text-[14px] text-ink mb-3">Couldn't load this.</p>
            <Button variant="secondary" size="sm" onClick={fetchFocusMetrics}>
              Retry
            </Button>
          </Card>
        ) : (
          <Card className="lg:col-span-2 xl:col-span-8 min-h-[320px] p-6 flex flex-col justify-between relative">
            {/* Header */}
            <div className="flex items-start justify-between min-h-8 mb-4">
              <div className="flex items-baseline">
                <h3 className="text-[16px] font-semibold text-ink">Focus this week</h3>
                <span className="text-[28px] font-semibold tabular-nums text-ink ml-3 tracking-tight">
                  {formatFocusTime(weeklyFocusMinutes)}
                </span>
                {deltaVsLastWeek !== null && (
                  <span
                    className={`ml-2.5 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums ${
                      deltaVsLastWeek >= 0
                        ? 'bg-success/15 text-success'
                        : 'bg-danger/15 text-danger'
                    }`}
                  >
                    {deltaVsLastWeek >= 0 ? `+${deltaVsLastWeek}%` : `${deltaVsLastWeek}%`} vs last week
                  </span>
                )}
              </div>

              <IconButton
                size="sm"
                variant="ghost"
                tooltip="View Insights"
                className="self-start"
                onClick={() => router.push('/insights')}
              >
                <ArrowUpRight className="w-4 h-4 text-ink-3" />
              </IconButton>
            </div>

            {/* Recharts Bar Chart / Empty Overlay */}
            <div className="w-full h-[220px] relative">
              {weeklyFocusMinutes === 0 && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/40 dark:bg-surface-2/40 backdrop-blur-[2px] rounded-xl gap-2">
                  <p className="text-[14px] text-ink-2">No focus sessions yet this week.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-text hover:bg-primary-soft"
                    onClick={() => router.push('/focus')}
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Start one
                  </Button>
                </div>
              )}

              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fxFocusGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3781FC" />
                      <stop offset="100%" stopColor="#1951FC" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--ink-3)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--ink-3)' }}
                    unit="h"
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'var(--surface-2)', opacity: 0.4 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-[12px] glass-strong px-3 py-2 text-[12px] text-ink shadow-md">
                            <span className="font-semibold block">{data.day}</span>
                            <span className="text-primary-text block">{data.focus}h focus</span>
                            {data.break > 0 && (
                              <span className="text-ink-3 block">{data.break}h break</span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="focus"
                    fill="url(#fxFocusGrad)"
                    barSize={28}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Card 5: TASKS (xl:col-span-4) */}
        {planLoading ? (
          <Skeleton className="lg:col-span-1 xl:col-span-4 min-h-[320px] rounded-[20px]" />
        ) : (
          <Card className="lg:col-span-1 xl:col-span-4 min-h-[320px] p-6 flex flex-col justify-between">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between min-h-8 mb-3">
                <div>
                  <h3 className="text-[16px] font-semibold text-ink">Tasks</h3>
                </div>
                <IconButton
                  size="sm"
                  variant="ghost"
                  tooltip="View Tasks"
                  className="self-start"
                  onClick={() => router.push('/plan?view=tasks')}
                >
                  <ArrowUpRight className="w-4 h-4 text-ink-3" />
                </IconButton>
              </div>

              {/* Quick-add task */}
              <form
                onSubmit={handleQuickAddTask}
                className="h-10 rounded-[14px] bg-surface-2 border border-line px-3 flex items-center justify-between mb-3 shadow-inner"
              >
                <input
                  type="text"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder="Add a task, press Enter"
                  className="bg-transparent text-[13px] text-ink placeholder:text-ink-3 outline-none flex-1 pr-2"
                />
                <Kbd>↵</Kbd>
              </form>

              {/* Task list */}
              <div className="flex flex-col gap-1 max-h-[170px] overflow-y-auto">
                {/* Overdue */}
                {overdueTasks.length > 0 && (
                  <div className="mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-danger block mb-1">
                      OVERDUE ({overdueTasks.length})
                    </span>
                    {overdueTasks.map((t) => (
                      <div
                        key={t.id}
                        className="h-8 flex items-center justify-between gap-2 px-1 hover:bg-surface-2/60 rounded-[8px]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Checkbox
                            checked={t.is_completed}
                            onChange={() => updateTask(t.id, { is_completed: true })}
                          />
                          <span className="text-[13px] text-ink truncate">{t.title}</span>
                        </div>
                        <span className="h-1.5 w-1.5 rounded-full bg-danger shrink-0" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Today */}
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3 block mb-1">
                    TODAY
                  </span>
                  {todayTasks.length === 0 && overdueTasks.length === 0 ? (
                    <p className="text-[13px] text-ink-3 text-center py-2">
                      No pending tasks for today.
                    </p>
                  ) : (
                    todayTasks.map((t) => {
                      const priorityColor =
                        t.priority === 'high'
                          ? 'bg-danger'
                          : t.priority === 'low'
                          ? 'bg-ink-3'
                          : 'bg-warning';
                      return (
                        <div
                          key={t.id}
                          className="h-8 flex items-center justify-between gap-2 px-1 hover:bg-surface-2/60 rounded-[8px]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Checkbox
                              checked={t.is_completed}
                              onChange={() => updateTask(t.id, { is_completed: true })}
                            />
                            <span className="text-[13px] text-ink truncate">{t.title}</span>
                          </div>
                          <span className={`h-1.5 w-1.5 rounded-full ${priorityColor} shrink-0`} />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* View all link */}
            <div className="pt-2 border-t border-line mt-2">
              <button
                type="button"
                onClick={() => router.push('/plan?view=tasks')}
                className="text-[12px] text-primary-text font-medium hover:underline"
              >
                View all tasks →
              </button>
            </div>
          </Card>
        )}

        {/* ================= ROW 3 ================= */}

        {/* Card 6: HABIT CONSISTENCY (xl:col-span-8, auto height) */}
        {loadingLogs ? (
          <Skeleton className="lg:col-span-2 xl:col-span-8 min-h-[260px] rounded-[20px]" />
        ) : logsError ? (
          <Card className="lg:col-span-2 xl:col-span-8 p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-8 h-8 text-danger mb-2" />
            <p className="text-[14px] text-ink mb-3">Couldn't load this.</p>
            <Button variant="secondary" size="sm" onClick={fetchHabitHeatmapLogs}>
              Retry
            </Button>
          </Card>
        ) : (
          <Card className="lg:col-span-2 xl:col-span-8 p-6 flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-start justify-between min-h-8 mb-4">
              <h3 className="text-[16px] font-semibold text-ink">Habit consistency</h3>
              <IconButton
                size="sm"
                variant="ghost"
                tooltip="Habits"
                className="self-start"
                onClick={() => router.push('/plan?view=habits')}
              >
                <ArrowUpRight className="w-4 h-4 text-ink-3" />
              </IconButton>
            </div>

            {/* Full width Heatmap Container with ResizeObserver */}
            <div ref={heatmapContainerRef} className="w-full">
              <div className="flex gap-2">
                <div
                  className="grid w-8 shrink-0 gap-1 pt-5 text-[11px] leading-4 text-ink-3"
                  style={{ gridTemplateRows: 'repeat(7, 16px)' }}
                >
                  <span className="row-start-1">Mon</span>
                  <span className="row-start-3">Wed</span>
                  <span className="row-start-5">Fri</span>
                </div>
                <div>
                  <div className="relative h-5">
                    {heatmapMonthLabels.map((m) => (
                      <span
                        key={m.key}
                        className="absolute top-0 whitespace-nowrap text-[11px] text-ink-3"
                        style={{ left: m.col * 20 }}
                      >
                        {m.label}
                      </span>
                    ))}
                  </div>
                  <div
                    className="grid grid-flow-col gap-1"
                    style={{
                      gridTemplateRows: 'repeat(7, 16px)',
                      gridTemplateColumns: `repeat(${heatmapWeeksCount}, 16px)`,
                    }}
                  >
                    {heatmapWeeks.map((week) =>
                      week.map((day) => {
                        let colorClass = 'bg-surface-2';
                        if (day.ratio > 0.75) colorClass = 'bg-primary';
                        else if (day.ratio > 0.5) colorClass = 'bg-primary/70';
                        else if (day.ratio > 0.25) colorClass = 'bg-primary/45';
                        else if (day.ratio > 0) colorClass = 'bg-primary/20';

                        return (
                          <div
                            key={day.dateStr}
                            title={`${day.dateStr}: ${Math.round(day.ratio * 100)}%`}
                            className={`h-4 w-4 rounded-[3px] ${colorClass} transition-colors`}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-1.5 text-[11px] text-ink-3 mt-3">
              <span>Less</span>
              <div className="h-3 w-3 rounded-[2px] bg-surface-2" />
              <div className="h-3 w-3 rounded-[2px] bg-primary/20" />
              <div className="h-3 w-3 rounded-[2px] bg-primary/45" />
              <div className="h-3 w-3 rounded-[2px] bg-primary/70" />
              <div className="h-3 w-3 rounded-[2px] bg-primary" />
              <span>More</span>
            </div>
          </Card>
        )}

        {/* Card 7: YOUR GROUP (xl:col-span-4) */}
        {loadingGroup ? (
          <Skeleton className="lg:col-span-1 xl:col-span-4 min-h-[280px] rounded-[20px]" />
        ) : groupError ? (
          <Card className="lg:col-span-1 xl:col-span-4 min-h-[280px] flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-8 h-8 text-danger mb-2" />
            <p className="text-[14px] text-ink mb-3">Couldn't load this.</p>
            <Button variant="secondary" size="sm" onClick={fetchGroup}>
              Retry
            </Button>
          </Card>
        ) : groupData && groupData.in_group ? (
          <Card className="lg:col-span-1 xl:col-span-4 min-h-[280px] p-6 flex flex-col justify-between">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between min-h-8">
                <div>
                  <h3 className="text-[16px] font-semibold text-ink">Your group</h3>
                  <p className="text-[13px] text-ink-3 mt-0.5">
                    {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
                  </p>
                </div>
                <IconButton
                  size="sm"
                  variant="ghost"
                  tooltip="Open Groups"
                  className="self-start"
                  onClick={() => router.push('/groups')}
                >
                  <ArrowUpRight className="w-4 h-4 text-ink-3" />
                </IconButton>
              </div>

              {/* Sub-header: You're #N of M */}
              {myRank && (
                <p className="text-[13px] text-ink-2 mt-2 font-medium">
                  You&apos;re #{myRank} of {totalMembers}
                </p>
              )}

              {/* Top 3 Members leaderboard */}
              <div className="flex flex-col gap-2 mt-3">
                {dedupedMembers.slice(0, 3).map((m, idx) => {
                  const isMe = m.user_id === user?.id || m.is_me;
                  return (
                    <div
                      key={m.user_id}
                      className={`flex items-center justify-between p-2 rounded-[10px] ${
                        isMe ? 'bg-primary-soft text-primary-text' : 'bg-surface-2/60 text-ink'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-[13px] tabular-nums font-semibold opacity-70 w-4">
                          #{idx + 1}
                        </span>
                        <Avatar size={28} name={m.display_name} />
                        <span className={`text-[14px] truncate font-medium ${isMe ? 'text-primary-text' : 'text-ink'}`}>
                          {m.display_name} {isMe && '(You)'}
                        </span>
                      </div>
                      <span className="text-[13px] tabular-nums font-medium">
                        {m.streak}d streak
                      </span>
                    </div>
                  );
                })}

                {/* 4th row for current user if not in top 3 */}
                {!isCurrentUserInTop3 && myMemberRecord && (
                  <>
                    <div className="h-px bg-line my-1" />
                    <div className="flex items-center justify-between p-2 rounded-[10px] bg-primary-soft text-primary-text">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-[13px] tabular-nums font-semibold opacity-70 w-4">
                          #{myRank}
                        </span>
                        <Avatar size={28} name={myMemberRecord.display_name} />
                        <span className="text-[14px] truncate font-medium text-primary-text">
                          {myMemberRecord.display_name} (You)
                        </span>
                      </div>
                      <span className="text-[13px] tabular-nums font-medium">
                        {myMemberRecord.streak}d streak
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/groups')}
              className="w-full mt-4 gap-1.5"
            >
              <span>Open group</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Card>
        ) : (
          <Card className="lg:col-span-1 xl:col-span-4 min-h-[280px] p-6 flex flex-col items-center justify-center">
            <EmptyState
              icon={<Users className="w-8 h-8 text-primary-text" />}
              title="Stay accountable"
              description="Join a group to track consistency with friends."
              actionLabel="Find a group"
              onAction={() => router.push('/groups')}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
