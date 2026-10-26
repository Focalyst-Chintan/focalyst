'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { createClient } from '@/lib/supabase';
import { localDateStr, addDaysYMD } from '@/lib/utils/date';
import { getPeriod, PeriodKind } from '@/lib/utils/period';
import { useFocusStats } from '@/hooks/useFocusStats';
import { onDataChanged } from '@/lib/events';
import { getLevelFromXp, LEVELS } from '@/lib/xp/levels';
import { minuteTicks, fmtMin } from '@/lib/utils/chart';
import dynamic from 'next/dynamic';
import { DesktopWeeklyReport, type WeeklyReportView as DesktopWeeklyReportData } from './DesktopWeeklyReport';

const LevelUpModal = dynamic(
  () => import('@/components/insights/LevelUpModal').then((m) => m.LevelUpModal),
  { ssr: false }
);
import { isPaidPlan } from '@/lib/featureGates';
import { Skeleton } from '@/components/desktop/ui/Skeleton';

// Desktop UI
import { Button } from '@/components/desktop/ui/Button';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { SegmentedControl } from '@/components/desktop/ui/SegmentedControl';
import { Modal } from '@/components/desktop/ui/Modal';
import { ProgressRing } from '@/components/desktop/ui/ProgressRing';
import { EmptyState } from '@/components/desktop/ui/EmptyState';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
  Star,
  Lock,
  Check,
  X,
} from 'lucide-react';

function MicroBars({ values, todayIndex }: { values: number[]; todayIndex?: number }) {
  const max = Math.max(1, ...values);
  return (
    <div className="mt-4 flex h-10 items-end gap-[3px]">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-[3px]"
          style={{
            height: `${Math.max(8, (v / max) * 100)}%`,
            background:
              v === 0
                ? 'var(--surface-3)'
                : i === todayIndex
                ? 'linear-gradient(180deg,#6FA4FF,#1951FC)'
                : 'color-mix(in srgb, #3781FC 55%, transparent)',
          }}
        />
      ))}
    </div>
  );
}

export default function DesktopInsightsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const supabase = createClient();
  const { habits, tasks } = usePlan();

  const periodParam = (searchParams.get('period') as PeriodKind) || 'week';
  const [kind, setKind] = useState<PeriodKind>(periodParam === 'month' ? 'month' : 'week');
  const [offset, setOffset] = useState<number>(0);

  const [totalXP, setTotalXP] = useState(0);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [userTimezone, setUserTimezone] = useState<string>('Asia/Kolkata');
  const [weeklyReport, setWeeklyReport] = useState<any | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportViewData, setReportViewData] = useState<DesktopWeeklyReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(false);
  const openedFromRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isLevelsModalOpen, setIsLevelsModalOpen] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

  // Auto-scroll ref for roadmap modal
  const currentLevelRowRef = useRef<HTMLDivElement>(null);

  // Sync kind with URL
  const handleKindChange = (newKind: string) => {
    const k = newKind as PeriodKind;
    setKind(k);
    setOffset(0);
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', k);
    router.push(`/insights?${params.toString()}`);
  };

  const period = useMemo(() => getPeriod(kind, offset), [kind, offset]);

  // Focus Stats for current & previous elapsed range
  const currentStats = useFocusStats(period.from, period.effectiveTo);
  const prevStats = useFocusStats(period.prevFrom, period.prevTo);
  const fullPeriodStats = useFocusStats(period.from, period.to);

  // For week view: query previous week full stats to compare each weekday
  const prevWeekFullStats = useFocusStats(
    addDaysYMD(period.from, -7),
    addDaysYMD(period.to, -7)
  );

  // Load user XP, plan & weekly reports
  const loadInsightsMeta = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('plan, total_xp, timezone')
        .eq('id', user.id)
        .single();

      if (profile) {
        setTotalXP(profile.total_xp || 0);
        setUserPlan(profile.plan || 'free');
        if (profile.timezone) {
          setUserTimezone(profile.timezone);
        }
      }

      const { data: reports } = await supabase
        .from('weekly_reports')
        .select('id, user_id, start_date, end_date, summary, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (reports && reports.length > 0) {
        setWeeklyReport(reports[0]);
      }
    } catch (err) {
      console.error('Failed to load insights meta:', err);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadInsightsMeta();
    const unsub = onDataChanged(['focus', 'task', 'habit'], loadInsightsMeta);
    return unsub;
  }, [loadInsightsMeta]);

  // Exact mobile XP level calculation
  const levelInfo = useMemo(() => getLevelFromXp(totalXP), [totalXP]);

  // Next 3 levels preview for Level Card
  const nextThreeLevels = useMemo(() => {
    return LEVELS.filter((l) => l.level > levelInfo.level).slice(0, 3);
  }, [levelInfo.level]);

  // Scroll to current level when roadmap modal opens
  useEffect(() => {
    if (isLevelsModalOpen) {
      const timer = setTimeout(() => {
        currentLevelRowRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isLevelsModalOpen]);

  // Tasks in period
  const tasksDoneCount = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.is_completed || !t.completed_at) return false;
      const d = localDateStr(new Date(t.completed_at));
      return d >= period.from && d <= period.effectiveTo;
    }).length;
  }, [tasks, period.from, period.effectiveTo]);

  const prevTasksDoneCount = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.is_completed || !t.completed_at) return false;
      const d = localDateStr(new Date(t.completed_at));
      return d >= period.prevFrom && d <= period.prevTo;
    }).length;
  }, [tasks, period.prevFrom, period.prevTo]);

  // Habits breakdown & consistency
  const { habitConsistencyPct, prevHabitConsistencyPct, habitBreakdown, totalHabitCheckins, totalHabitScheduled } = useMemo(() => {
    if (habits.length === 0) {
      return {
        habitConsistencyPct: 0,
        prevHabitConsistencyPct: 0,
        habitBreakdown: [],
        totalHabitCheckins: 0,
        totalHabitScheduled: 0,
      };
    }

    let daysCount = 0;
    let cur = period.from;
    const currentDates: string[] = [];
    while (cur <= period.effectiveTo) {
      currentDates.push(cur);
      cur = addDaysYMD(cur, 1);
      daysCount++;
    }

    let prevCur = period.prevFrom;
    const prevDates: string[] = [];
    while (prevCur <= period.prevTo) {
      prevDates.push(prevCur);
      prevCur = addDaysYMD(prevCur, 1);
    }

    let currentCompletedCount = 0;
    let prevCompletedCount = 0;

    // Week day dates (Mon..Sun of current week) for 7 dots
    const weekDates: string[] = [];
    let wCur = period.from;
    for (let i = 0; i < 7; i++) {
      weekDates.push(wCur);
      wCur = addDaysYMD(wCur, 1);
    }

    const breakdown = habits.map((h) => {
      const dates = new Set((h.completedDates || []).map((d: any) => String(d).slice(0, 10)));
      let currentHits = 0;
      currentDates.forEach((d) => {
        if (dates.has(d)) currentHits++;
      });

      let prevHits = 0;
      prevDates.forEach((d) => {
        if (dates.has(d)) prevHits++;
      });

      currentCompletedCount += currentHits;
      prevCompletedCount += prevHits;

      const pct = Math.min(100, Math.round((currentHits / Math.max(1, daysCount)) * 100));

      const weekDots = weekDates.map((d) => ({
        date: d,
        done: dates.has(d),
      }));

      return {
        id: h.id,
        name: h.name,
        icon: h.icon || '🎯',
        color: h.color || '#3781FC',
        pct,
        logsCount: currentHits,
        weekDots,
      };
    });

    const totalScheduled = habits.length * Math.max(1, daysCount);
    const habitConsistencyPct = Math.min(100, Math.round((currentCompletedCount / Math.max(1, totalScheduled)) * 100));

    const totalPrevScheduled = habits.length * Math.max(1, prevDates.length);
    const prevHabitConsistencyPct = Math.min(100, Math.round((prevCompletedCount / Math.max(1, totalPrevScheduled)) * 100));

    breakdown.sort((a, b) => b.pct - a.pct);

    return {
      habitConsistencyPct,
      prevHabitConsistencyPct,
      habitBreakdown: breakdown,
      totalHabitCheckins: currentCompletedCount,
      totalHabitScheduled: totalScheduled,
    };
  }, [habits, period.from, period.effectiveTo, period.prevFrom, period.prevTo]);

  // Per-day series for KPI MicroBars
  const todayYMD = localDateStr();
  const kpiSeries = useMemo(() => {
    const focusVals: number[] = [];
    const sessionsVals: number[] = [];
    const habitPctVals: number[] = [];
    const taskVals: number[] = [];
    let todayIdx = -1;

    let cur = period.from;
    let idx = 0;
    while (cur <= period.to) {
      if (cur === todayYMD) todayIdx = idx;

      // Focus minutes & sessions
      focusVals.push(fullPeriodStats.byDay[cur] || 0);

      // Sessions for cur day
      const daySessions = (fullPeriodStats.rows || []).filter(
        (r: any) => localDateStr(new Date(r.started_at || r.created_at)) === cur
      ).length;
      sessionsVals.push(daySessions);

      // Habit completion % for cur day
      if (habits.length > 0) {
        const doneHabits = habits.filter((h) =>
          (h.completedDates || []).some((d: any) => String(d).slice(0, 10) === cur)
        ).length;
        habitPctVals.push(Math.round((doneHabits / habits.length) * 100));
      } else {
        habitPctVals.push(0);
      }

      // Tasks completed on cur day
      const doneTasks = tasks.filter((t) => {
        if (!t.is_completed || !t.completed_at) return false;
        return localDateStr(new Date(t.completed_at)) === cur;
      }).length;
      taskVals.push(doneTasks);

      cur = addDaysYMD(cur, 1);
      idx++;
    }

    return { focusVals, sessionsVals, habitPctVals, taskVals, todayIdx };
  }, [period.from, period.to, todayYMD, fullPeriodStats, habits, tasks]);

  // Context line values
  const elapsedDaysCount = Math.max(
    1,
    Math.round(
      (new Date(period.effectiveTo + 'T12:00:00').getTime() -
        new Date(period.from + 'T12:00:00').getTime()) /
        86400000
    ) + 1
  );
  const avgFocusPerDayMin = Math.round(currentStats.totalMinutes / elapsedDaysCount);
  const avgSessionMin =
    currentStats.sessions > 0
      ? Math.round(currentStats.totalMinutes / currentStats.sessions)
      : 0;
  const stillOpenTasksCount = tasks.filter((t) => !t.is_completed).length;

  // Delta helpers
  const computeDelta = (curr: number, prev: number) => {
    if (prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const focusDelta = computeDelta(currentStats.totalMinutes, prevStats.totalMinutes);
  const sessionsDelta = computeDelta(currentStats.sessions, prevStats.sessions);
  const tasksDelta = computeDelta(tasksDoneCount, prevTasksDoneCount);
  const habitsDelta = computeDelta(habitConsistencyPct, prevHabitConsistencyPct);

  // Grouped BarChart for Week focus activity: this week vs last week weekday
  const weekGroupedData = useMemo(() => {
    if (kind !== 'week') return [];
    const list: {
      weekday: string;
      fullDate: string;
      thisWeek: number;
      lastWeek: number;
    }[] = [];

    let cur = period.from;
    while (cur <= period.to) {
      const d = new Date(cur + 'T12:00:00');
      const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
      const lastWeekDate = addDaysYMD(cur, -7);

      list.push({
        weekday,
        fullDate: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
        thisWeek: fullPeriodStats.byDay[cur] || 0,
        lastWeek: prevWeekFullStats.byDay[lastWeekDate] || 0,
      });

      cur = addDaysYMD(cur, 1);
    }
    return list;
  }, [kind, period.from, period.to, fullPeriodStats.byDay, prevWeekFullStats.byDay]);

  // Month calendar data
  const monthCalendarData = useMemo(() => {
    if (kind !== 'month') return null;

    // First day of month
    const [y, m] = period.from.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const totalDays = lastDay.getDate();

    // Monday-based start offset: 0=Mon, 6=Sun
    let startDayOfWeek = (firstDay.getDay() + 6) % 7;

    // Calculate month max for quartiles
    let monthMax = 1;
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const mins = fullPeriodStats.byDay[dayStr] || 0;
      if (mins > monthMax) monthMax = mins;
    }

    // Cells
    const cells: {
      dayNumber: number;
      dateStr: string;
      minutes: number;
      isToday: boolean;
      isFuture: boolean;
      isCurrentMonth: boolean;
    }[] = [];

    // Leading padding days from previous month
    const prevMonthDays = new Date(y, m - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        dayNumber: prevMonthDays - i,
        dateStr: '',
        minutes: 0,
        isToday: false,
        isFuture: true,
        isCurrentMonth: false,
      });
    }

    // Current month days
    let bestDayStr = '';
    let bestDayMins = 0;
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const mins = fullPeriodStats.byDay[dayStr] || 0;
      if (mins > bestDayMins) {
        bestDayMins = mins;
        bestDayStr = dayStr;
      }
      cells.push({
        dayNumber: d,
        dateStr: dayStr,
        minutes: mins,
        isToday: dayStr === todayYMD,
        isFuture: dayStr > todayYMD,
        isCurrentMonth: true,
      });
    }

    // Trailing padding to complete 7-col rows
    while (cells.length % 7 !== 0) {
      cells.push({
        dayNumber: 0,
        dateStr: '',
        minutes: 0,
        isToday: false,
        isFuture: true,
        isCurrentMonth: false,
      });
    }

    // Weekly totals (W1, W2, ...)
    const weeklyTotals: { label: string; minutes: number }[] = [];
    const numWeeks = cells.length / 7;
    for (let w = 0; w < numWeeks; w++) {
      const weekCells = cells.slice(w * 7, (w + 1) * 7);
      const wMins = weekCells.reduce((sum, c) => sum + (c.isCurrentMonth ? c.minutes : 0), 0);
      weeklyTotals.push({ label: `W${w + 1}`, minutes: wMins });
    }

    // Format best day string
    let bestDayLabel = 'None';
    if (bestDayMins > 0 && bestDayStr) {
      const bDate = new Date(bestDayStr + 'T12:00:00');
      bestDayLabel = `${bDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} · ${fmtMin(bestDayMins)}`;
    }

    return {
      cells,
      weeklyTotals,
      monthMax,
      bestDayLabel,
    };
  }, [kind, period.from, fullPeriodStats.byDay, todayYMD]);

  // Max minutes for ticks
  const weekMaxMin = useMemo(() => {
    if (kind !== 'week') return 60;
    const all = weekGroupedData.flatMap((d) => [d.thisWeek, d.lastWeek]);
    return Math.max(1, ...all);
  }, [kind, weekGroupedData]);

  const yTicks = useMemo(() => minuteTicks(weekMaxMin), [weekMaxMin]);

  // Best Focus Time: 24 bars + 4 quadrants (Morning 5..12, Afternoon 12..17, Evening 17..21, Night 21..5)
  const { peakHour, peakMinutes, byHourData, quadrants, bestSentence } = useMemo(() => {
    const arr = fullPeriodStats.byHour || Array(24).fill(0);
    let bestH = 21;
    let maxM = 0;
    arr.forEach((m: number, h: number) => {
      if (m > maxM) {
        maxM = m;
        bestH = h;
      }
    });

    const byHourList = arr.map((m: number, h: number) => ({
      hour: h,
      minutes: m,
    }));

    // Quadrants share
    const totalM = arr.reduce((acc, m) => acc + m, 0);
    let morningM = 0; // 5 to 12
    let afternoonM = 0; // 12 to 17
    let eveningM = 0; // 17 to 21
    let nightM = 0; // 21 to 5

    arr.forEach((m: number, h: number) => {
      if (h >= 5 && h < 12) morningM += m;
      else if (h >= 12 && h < 17) afternoonM += m;
      else if (h >= 17 && h < 21) eveningM += m;
      else nightM += m;
    });

    const share = (m: number) => (totalM > 0 ? Math.round((m / totalM) * 100) : 0);

    const quads = [
      { name: 'Morning', range: '5 to 12', share: share(morningM) },
      { name: 'Afternoon', range: '12 to 17', share: share(afternoonM) },
      { name: 'Evening', range: '17 to 21', share: share(eveningM) },
      { name: 'Night', range: '21 to 5', share: share(nightM) },
    ];

    const sentence =
      totalM < 15
        ? 'Not enough sessions yet.'
        : `You focus best around ${bestH === 0 ? '12 AM' : bestH === 12 ? '12 PM' : bestH > 12 ? `${bestH - 12} PM` : `${bestH} AM`}`;

    return { peakHour: bestH, peakMinutes: maxM, byHourData: byHourList, quadrants: quads, bestSentence: sentence };
  }, [fullPeriodStats.byHour]);

  // Productivity score calculation: component points
  const prodBreakdown = useMemo(() => {
    const totalTasksInPeriod = tasksDoneCount + stillOpenTasksCount;
    let taskScore = 0;
    if (totalTasksInPeriod > 0) {
      taskScore = Math.min(40, Math.round((tasksDoneCount / totalTasksInPeriod) * 40));
    }

    let habitScore = 0;
    if (habits.length > 0) {
      const streakSum = habits.reduce((acc, h) => acc + (h.current_streak || 0), 0);
      const avgStreak = streakSum / habits.length;
      habitScore = Math.min(35, Math.round((avgStreak / 7) * 35));
    }

    let focusScore = 0;
    if (prevStats.totalMinutes > 0) {
      focusScore = Math.min(25, Math.round((currentStats.totalMinutes / prevStats.totalMinutes) * 25));
    } else if (currentStats.totalMinutes > 0) {
      focusScore = 25;
    }

    const total = Math.min(100, taskScore + habitScore + focusScore);

    let grade = 'Grade B';
    if (total >= 90) grade = 'Grade A+';
    else if (total >= 80) grade = 'Grade A';
    else if (total >= 70) grade = 'Grade B+';
    else if (total >= 60) grade = 'Grade B';
    else if (total >= 50) grade = 'Grade C';
    else grade = 'Grade D';

    return {
      taskScore,
      habitScore,
      focusScore,
      total,
      grade,
    };
  }, [tasksDoneCount, stillOpenTasksCount, habits, prevStats.totalMinutes, currentStats.totalMinutes]);

  // Highlights Card (Row 4): Best day, Longest session, Average session, Active days
  const highlights = useMemo(() => {
    const rows = fullPeriodStats.rows || [];

    // Best day
    let bestDayStr = '';
    let bestDayM = 0;
    Object.entries(fullPeriodStats.byDay || {}).forEach(([day, m]) => {
      if (m > bestDayM) {
        bestDayM = m;
        bestDayStr = day;
      }
    });
    let bestDayText = 'None';
    if (bestDayM > 0 && bestDayStr) {
      const d = new Date(bestDayStr + 'T12:00:00');
      bestDayText = `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtMin(bestDayM)}`;
    }

    // Longest session
    let longestM = 0;
    rows.forEach((r: any) => {
      const m = Number(r.focus_minutes) || 0;
      if (m > longestM) longestM = m;
    });

    // Average session
    const avgSess = rows.length > 0 ? Math.round(fullPeriodStats.totalMinutes / rows.length) : 0;

    // Active days in period
    const activeDaysCount = Object.values(fullPeriodStats.byDay || {}).filter((m) => m > 0).length;
    const totalPeriodDays =
      kind === 'week'
        ? 7
        : Math.round(
            (new Date(period.to + 'T12:00:00').getTime() -
              new Date(period.from + 'T12:00:00').getTime()) /
              86400000
          ) + 1;

    return {
      bestDay: bestDayText,
      longestSession: longestM > 0 ? `${longestM}m` : '0m',
      averageSession: avgSess > 0 ? `${avgSess}m` : '0m',
      activeDays: `${activeDaysCount} of ${totalPeriodDays}`,
    };
  }, [fullPeriodStats, kind, period.from, period.to]);

  const fetchReport = useCallback(async () => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const weekKey = `${d.getUTCFullYear()}-W${weekNo}`;
    const cacheKey = `focalyst_report_data_${weekKey}`;

    const mapDataToView = (data: any): DesktopWeeklyReportData => {
      const timeZone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      let start: Date;
      let end: Date;
      if (data.startDate && data.endDate) {
        start = new Date(data.startDate);
        end = new Date(data.endDate);
      } else {
        const day = now.getDay();
        const daysToSubtract = day === 6 ? 7 : (day + 1);
        end = new Date(now);
        end.setDate(now.getDate() - daysToSubtract);
        start = new Date(end);
        start.setDate(end.getDate() - 6);
      }
      const fmt = (dt: Date) =>
        new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone }).format(dt);
      const rangeLabel = `${fmt(start)} to ${fmt(end)}`;

      let focusM = 0;
      if (typeof data.focusTime === 'string') {
        const hMatch = data.focusTime.match(/(\d+)\s*h/);
        if (hMatch) focusM += parseInt(hMatch[1], 10) * 60;
        const mMatch = data.focusTime.match(/(\d+)\s*m/);
        if (mMatch) focusM += parseInt(mMatch[1], 10);
        if (!hMatch && !mMatch) {
          const n = parseInt(data.focusTime, 10);
          if (!isNaN(n)) focusM = n;
        }
      } else if (typeof data.focusMinutes === 'number') {
        focusM = data.focusMinutes;
      } else {
        focusM = currentStats.totalMinutes;
      }

      const tasksDone = typeof data.tasksCompleted === 'number'
        ? data.tasksCompleted
        : (typeof data.tasksDone === 'number' ? data.tasksDone : tasksDoneCount);

      const totalTasksInPeriod = tasksDoneCount + stillOpenTasksCount;
      const taskCompletionPct = typeof data.taskCompletionPct === 'number'
        ? data.taskCompletionPct
        : (totalTasksInPeriod > 0
            ? Math.round((tasksDoneCount / totalTasksInPeriod) * 100)
            : (tasksDone > 0 ? 100 : 0));

      const habitPct = typeof data.habitConsistency === 'string'
        ? (parseInt(data.habitConsistency, 10) || habitConsistencyPct || 0)
        : (typeof data.habitPct === 'number' ? data.habitPct : habitConsistencyPct || 0);

      const insight = data.weekSummaryText || data.insight || '';

      const strengths = Array.isArray(data.strengths) && data.strengths.length > 0
        ? data.strengths
        : undefined;

      const cat = data.catalystInsights || data.catalyst;
      const catalyst = cat && (cat.pattern || cat.weakness || cat.prescription)
        ? {
            pattern: cat.pattern || '',
            weakness: cat.weakness || '',
            prescription: cat.prescription || '',
          }
        : null;

      return {
        rangeLabel,
        score: Math.round(data.score ?? prodBreakdown.total ?? 0),
        focusMinutes: focusM,
        tasksDone,
        taskCompletionPct,
        habitPct,
        insight,
        strengths,
        catalyst,
        generatedAt: data.generatedAt || data.created_at || (data.startDate ? new Date().toISOString() : undefined),
      };
    };

    const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setReportViewData(mapDataToView(parsed));
        setReportLoading(false);
        return;
      } catch {}
    }

    try {
      setReportLoading(true);
      setReportError(false);
      const res = await fetch('/api/ai/weekly-report', { method: 'POST' });
      if (!res.ok) {
        setReportError(true);
        setReportLoading(false);
        return;
      }
      const data = await res.json();
      setReportViewData(mapDataToView(data));
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (err) {
      console.error('[DesktopWeeklyReport] fetch error:', err);
      setReportError(true);
    } finally {
      setReportLoading(false);
    }
  }, [userTimezone, currentStats.totalMinutes, tasksDoneCount, stillOpenTasksCount, habitConsistencyPct, prodBreakdown.total]);

  const openReportModal = (e?: React.MouseEvent) => {
    openedFromRef.current = (e?.currentTarget as HTMLElement) || (document.activeElement as HTMLElement | null);
    setIsReportModalOpen(true);
    if (!reportViewData && !reportLoading) {
      fetchReport();
    }
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
    setTimeout(() => {
      openedFromRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    if (!isReportModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeReportModal();
        return;
      }
      if (e.key === 'Tab') {
        const el = dialogRef.current;
        if (!el) return;
        const focusable = el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReportModalOpen]);

  useEffect(() => {
    if (isReportModalOpen && dialogRef.current) {
      const first = dialogRef.current.querySelector<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }
  }, [isReportModalOpen, reportLoading, reportError]);

  return (
    <div className="pb-16 max-w-[1280px] mx-auto">
      {/* Chart Gradients */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="fxFocusThisWeekGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3781FC" />
            <stop offset="100%" stopColor="#1951FC" />
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-[32px] leading-[38px] text-ink">
          Insights
        </h1>
        <div className="flex items-center gap-3">
          <SegmentedControl
            options={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            value={kind}
            onChange={handleKindChange}
          />
          <div className="flex items-center gap-1 bg-surface-2 rounded-[12px] p-0.5 border border-line">
            <IconButton
              label="Previous period"
              size="sm"
              variant="ghost"
              onClick={() => setOffset((o) => o - 1)}
            >
              <ChevronLeft size={16} />
            </IconButton>
            <span className="text-[13px] font-medium tabular-nums text-ink min-w-[130px] text-center px-1">
              {period.label}
            </span>
            <IconButton
              label="Next period"
              size="sm"
              variant="ghost"
              disabled={offset >= 0}
              onClick={() => setOffset((o) => Math.min(0, o + 1))}
            >
              <ChevronRight size={16} />
            </IconButton>
          </div>
        </div>
      </div>

      {/* 12-COLUMN BENTO GRID */}
      <div className="grid grid-cols-12 gap-5">
        {/* ROW 1: 4 KPI Cards with MicroBars */}
        {/* KPI 1: Focus time */}
        <div className="col-span-3 frost p-5 rounded-[20px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-2 font-medium">Focus time</span>
              {focusDelta !== null && (
                <span
                  className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full ${
                    focusDelta >= 0 ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger'
                  }`}
                >
                  {focusDelta >= 0 ? `+${focusDelta}%` : `${focusDelta}%`} vs last {kind}
                </span>
              )}
            </div>
            <div className="text-[32px] leading-[36px] font-semibold tabular-nums text-ink mt-1">
              {fmtMin(currentStats.totalMinutes)}
            </div>
            <div className="text-[12px] text-ink-3 mt-0.5">
              Avg {fmtMin(avgFocusPerDayMin)} a day
            </div>
          </div>
          <MicroBars values={kpiSeries.focusVals} todayIndex={kpiSeries.todayIdx} />
        </div>

        {/* KPI 2: Sessions */}
        <div className="col-span-3 frost p-5 rounded-[20px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-2 font-medium">Sessions</span>
              {sessionsDelta !== null && (
                <span
                  className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full ${
                    sessionsDelta >= 0 ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger'
                  }`}
                >
                  {sessionsDelta >= 0 ? `+${sessionsDelta}%` : `${sessionsDelta}%`} vs last {kind}
                </span>
              )}
            </div>
            <div className="text-[32px] leading-[36px] font-semibold tabular-nums text-ink mt-1">
              {currentStats.sessions}
            </div>
            <div className="text-[12px] text-ink-3 mt-0.5">
              Avg {avgSessionMin}m each
            </div>
          </div>
          <MicroBars values={kpiSeries.sessionsVals} todayIndex={kpiSeries.todayIdx} />
        </div>

        {/* KPI 3: Habit consistency */}
        <div className="col-span-3 frost p-5 rounded-[20px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-2 font-medium">Habit consistency</span>
              {habitsDelta !== null && (
                <span
                  className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full ${
                    habitsDelta >= 0 ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger'
                  }`}
                >
                  {habitsDelta >= 0 ? `+${habitsDelta}%` : `${habitsDelta}%`} vs last {kind}
                </span>
              )}
            </div>
            <div className="text-[32px] leading-[36px] font-semibold tabular-nums text-ink mt-1">
              {habitConsistencyPct}%
            </div>
            <div className="text-[12px] text-ink-3 mt-0.5">
              {totalHabitCheckins} of {totalHabitScheduled} check-ins
            </div>
          </div>
          <MicroBars values={kpiSeries.habitPctVals} todayIndex={kpiSeries.todayIdx} />
        </div>

        {/* KPI 4: Tasks done */}
        <div className="col-span-3 frost p-5 rounded-[20px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-2 font-medium">Tasks done</span>
              {tasksDelta !== null && (
                <span
                  className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full ${
                    tasksDelta >= 0 ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger'
                  }`}
                >
                  {tasksDelta >= 0 ? `+${tasksDelta}%` : `${tasksDelta}%`} vs last {kind}
                </span>
              )}
            </div>
            <div className="text-[32px] leading-[36px] font-semibold tabular-nums text-ink mt-1">
              {tasksDoneCount}
            </div>
            <div className="text-[12px] text-ink-3 mt-0.5">
              {stillOpenTasksCount} still open
            </div>
          </div>
          <MicroBars values={kpiSeries.taskVals} todayIndex={kpiSeries.todayIdx} />
        </div>

        {/* ROW 2: Focus Activity (8 cols) & Level Card (4 cols) */}
        {/* FOCUS ACTIVITY */}
        <div className="col-span-8 frost p-5 rounded-[20px] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-semibold text-ink">Focus activity</h3>
              {kind === 'month' && monthCalendarData && (
                <div className="text-[12px] text-ink-3 mt-0.5">
                  Best day: {monthCalendarData.bestDayLabel}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {kind === 'week' && (
                <div className="flex items-center gap-3 text-[12px]">
                  <div className="flex items-center gap-1.5 text-ink-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#3781FC] to-[#1951FC]" />
                    <span>This week</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ink-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-surface-3" />
                    <span>Last week</span>
                  </div>
                </div>
              )}
              <span className="text-[13px] tabular-nums text-ink font-semibold">
                Total {fmtMin(currentStats.totalMinutes)}
              </span>
            </div>
          </div>

          {currentStats.totalMinutes === 0 ? (
            <div className="py-16">
              <EmptyState
                title={`No focus yet this ${kind}.`}
                description="Start a focus session to build momentum and earn XP."
                actionLabel="Start a session"
                onAction={() => router.push('/focus')}
              />
            </div>
          ) : kind === 'week' ? (
            /* WEEK: Grouped BarChart */
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weekGroupedData}
                  barGap={4}
                  margin={{ top: 12, right: 20, left: -20, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis
                    dataKey="weekday"
                    tick={{ fontSize: 12, fill: 'var(--ink-3)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    ticks={yTicks}
                    tick={{ fontSize: 12, fill: 'var(--ink-3)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtMin}
                  />
                  <ReferenceLine
                    y={avgFocusPerDayMin}
                    stroke="var(--ink-3)"
                    strokeDasharray="4 4"
                    label={{
                      value: `Avg ${fmtMin(avgFocusPerDayMin)}`,
                      position: 'right',
                      fill: 'var(--ink-3)',
                      fontSize: 11,
                    }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'var(--surface-2)', opacity: 0.5 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="glass-strong rounded-[12px] px-3.5 py-2.5 text-[13px] text-ink tabular-nums shadow-lg space-y-1">
                            <div className="font-semibold">{data.fullDate}</div>
                            <div className="text-primary-text">
                              This week: {fmtMin(data.thisWeek)}
                            </div>
                            <div className="text-ink-3">
                              Last week: {fmtMin(data.lastWeek)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="lastWeek"
                    fill="var(--surface-3)"
                    barSize={14}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="thisWeek"
                    fill="url(#fxFocusThisWeekGrad)"
                    barSize={14}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            /* MONTH: Focus Calendar Grid */
            monthCalendarData && (
              <div className="flex gap-6 items-start">
                <div className="flex-1">
                  {/* Mon..Sun micro headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div
                        key={day}
                        className="text-center text-[11px] font-semibold uppercase tracking-wider text-ink-3"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* 7-Col Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {monthCalendarData.cells.map((c, idx) => {
                      if (!c.isCurrentMonth) {
                        return (
                          <div
                            key={idx}
                            className="aspect-[1.5/1] rounded-[10px] p-2 bg-surface-2/40 opacity-30"
                          />
                        );
                      }

                      // Background intensity by quartile of month max
                      const q = c.minutes / Math.max(1, monthCalendarData.monthMax);
                      let bgStyle = 'bg-surface-2';
                      if (c.minutes > 0) {
                        if (q <= 0.25) bgStyle = 'bg-[#1951FC]/15';
                        else if (q <= 0.5) bgStyle = 'bg-[#1951FC]/35';
                        else if (q <= 0.75) bgStyle = 'bg-[#1951FC]/60';
                        else bgStyle = 'bg-[#1951FC]/85 text-snow';
                      }

                      return (
                        <div
                          key={idx}
                          className={`aspect-[1.5/1] rounded-[10px] p-2 flex flex-col justify-between transition-colors relative ${bgStyle} ${
                            c.isToday ? 'ring-1 ring-primary' : ''
                          } ${c.isFuture ? 'opacity-40' : ''}`}
                        >
                          <span
                            className={`text-[11px] font-medium leading-none ${
                              q > 0.75 && c.minutes > 0 ? 'text-snow/80' : 'text-ink-3'
                            }`}
                          >
                            {c.dayNumber}
                          </span>
                          {c.minutes > 0 && (
                            <span
                              className={`text-[12px] font-semibold tabular-nums text-right leading-none ${
                                q > 0.75 ? 'text-snow' : 'text-ink'
                              }`}
                            >
                              {fmtMin(c.minutes)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right sidebar: Weekly totals list */}
                <div className="w-28 shrink-0 flex flex-col gap-2 pt-6 border-l border-line pl-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1">
                    Totals
                  </span>
                  {monthCalendarData.weeklyTotals.map((w) => (
                    <div
                      key={w.label}
                      className="flex items-center justify-between text-[12px] tabular-nums"
                    >
                      <span className="text-ink-3">{w.label}</span>
                      <span className="font-semibold text-ink">{fmtMin(w.minutes)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* LEVEL CARD (col-span-4, stretches to row height) */}
        <div
          className="col-span-4 relative overflow-hidden rounded-[20px] p-6 text-snow flex flex-col justify-between"
          style={{
            background:
              'radial-gradient(120% 120% at 0% 100%, #1951FC 0%, #0B2CB1 45%, #03195B 100%)',
          }}
        >
          <div className="ambient-grain" />

          <div className="relative z-10">
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div className="w-16 h-16 rounded-2xl bg-snow/12 border border-snow/20 backdrop-blur-md flex flex-col items-center justify-center shadow-inner">
                <Star size={22} className="text-snow mb-0.5" />
                <span className="text-[11px] font-semibold text-snow leading-none">
                  LV {levelInfo.level}
                </span>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-snow/60">
                  CURRENT LEVEL
                </div>
                <div className="font-display text-[30px] leading-[34px] text-snow mt-0.5">
                  {levelInfo.title}
                </div>
              </div>
            </div>

            {/* XP row mt-6 */}
            <div className="mt-6">
              <div className="flex items-baseline gap-1">
                <span className="text-[28px] font-semibold tabular-nums text-snow leading-none">
                  {totalXP.toLocaleString()} XP
                </span>
                <span className="text-[14px] text-snow/60">
                  / {levelInfo.nextXp.toLocaleString()} XP base
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-snow/15 overflow-hidden mt-2.5">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(levelInfo.progress * 100)}%`,
                    background: 'linear-gradient(90deg, #CBE9FD, #FFFFFF)',
                    boxShadow: '0 0 12px rgba(203,233,253,0.7)',
                  }}
                />
              </div>

              <div className="text-[13px] text-snow/75 mt-2">
                {levelInfo.level === 15
                  ? 'Limitless reached · Max Level'
                  : `${levelInfo.remaining.toLocaleString()} XP remaining to Level ${levelInfo.nextLevel}`}
              </div>
            </div>

            {/* Next levels mt-6: 3 rows */}
            <div className="mt-6 space-y-1.5">
              {nextThreeLevels.map((lvl) => (
                <div
                  key={lvl.level}
                  className="h-9 rounded-[10px] bg-snow/8 px-3 flex items-center justify-between text-snow"
                >
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-snow/50" />
                    <span className="text-[13px] text-snow/85 font-medium">
                      Level {lvl.level} · {lvl.title}
                    </span>
                  </div>
                  <span className="text-[12px] tabular-nums text-snow/60 font-medium">
                    {lvl.xp.toLocaleString()} XP
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 mt-6 pt-4 border-t border-snow/15 flex justify-end">
            <Button
              variant="onDark"
              size="sm"
              onClick={() => setIsLevelsModalOpen(true)}
            >
              View roadmap
            </Button>
          </div>
        </div>

        {/* ROW 3: Best Focus Time (4 cols), Habits (4 cols), Productivity Score (4 cols) */}
        {/* BEST FOCUS TIME */}
        <div className="col-span-4 frost p-5 rounded-[20px] flex flex-col justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-ink mb-3">Best focus time</h3>
            <div className="h-[130px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byHourData}
                  barCategoryGap={2}
                  margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="hour"
                    ticks={[0, 6, 12, 18]}
                    tickFormatter={(h) => (h === 0 ? '12a' : h === 6 ? '6a' : h === 12 ? '12p' : '6p')}
                    tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Bar dataKey="minutes" radius={[3, 3, 0, 0]}>
                    {byHourData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === peakHour && peakMinutes > 0
                            ? 'url(#fxFocusThisWeekGrad)'
                            : 'var(--surface-3)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 4-segment row */}
            <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-line mt-3">
              {quadrants.map((q) => (
                <div key={q.name} className="text-center">
                  <div className="text-[11px] text-ink-3 truncate">{q.name}</div>
                  <div className="text-[14px] font-semibold tabular-nums text-ink mt-0.5">
                    {q.share}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[13px] text-ink-2 font-medium mt-3">
            {bestSentence}
          </div>
        </div>

        {/* HABITS */}
        <div className="col-span-4 frost p-5 rounded-[20px] flex flex-col justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-ink mb-3">Habits</h3>
            {habitBreakdown.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-ink-3">
                No active habits scheduled.
              </div>
            ) : (
              <div className="space-y-2.5">
                {habitBreakdown.slice(0, 6).map((h) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[13px] shrink-0"
                      style={{ backgroundColor: `${h.color}22` }}
                    >
                      {h.icon}
                    </div>
                    <span className="text-[13px] text-ink truncate flex-1 min-w-[70px]">
                      {h.name}
                    </span>

                    {/* In WEEK view: 7 tiny dots per habit */}
                    {kind === 'week' && (
                      <div className="flex items-center gap-1 shrink-0 px-1">
                        {h.weekDots.map((dot, dIdx) => (
                          <span
                            key={dIdx}
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: dot.done ? h.color : 'var(--surface-3)',
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <span className="text-[13px] tabular-nums font-semibold text-ink-2 w-9 text-right shrink-0">
                      {h.pct}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-[12px] text-ink-3 pt-2">
            Consistency across your daily routines
          </div>
        </div>

        {/* PRODUCTIVITY SCORE */}
        <div className="col-span-4 frost p-5 rounded-[20px] flex flex-col justify-between">
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-[16px] font-semibold text-ink">Productivity score</h3>
              <span className="text-[12px] text-ink-3">Based on tasks, habits and focus</span>
            </div>

            <div className="flex items-center gap-5 mt-2">
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing
                  progress={prodBreakdown.total}
                  size={108}
                  strokeWidth={9}
                  className="text-primary"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[28px] font-semibold tabular-nums text-ink leading-none">
                    {prodBreakdown.total}
                  </span>
                  <span className="text-[10px] font-semibold text-ink-3 mt-0.5">SCORE</span>
                </div>
              </div>

              {/* Earned Points Rows with 4px bars */}
              <div className="flex-1 space-y-2.5">
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-primary-soft text-primary-text mb-0.5">
                  {prodBreakdown.grade}
                </div>

                {/* Tasks */}
                <div>
                  <div className="flex justify-between text-[12px] tabular-nums text-ink-2 mb-1">
                    <span>Tasks</span>
                    <span className="font-semibold text-ink">{prodBreakdown.taskScore} / 40</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(prodBreakdown.taskScore / 40) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Habits */}
                <div>
                  <div className="flex justify-between text-[12px] tabular-nums text-ink-2 mb-1">
                    <span>Habits</span>
                    <span className="font-semibold text-ink">{prodBreakdown.habitScore} / 35</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(prodBreakdown.habitScore / 35) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Focus */}
                <div>
                  <div className="flex justify-between text-[12px] tabular-nums text-ink-2 mb-1">
                    <span>Focus</span>
                    <span className="font-semibold text-ink">{prodBreakdown.focusScore} / 25</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(prodBreakdown.focusScore / 25) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4: Highlights (4 cols) | Current streaks (4 cols) | AI summary (4 cols) */}
        {/* HIGHLIGHTS */}
        <div className="col-span-4 frost p-5 rounded-[20px] flex flex-col justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-ink mb-4">Highlights</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <span className="text-[12px] text-ink-3">Best day</span>
                <span className="text-[14px] font-semibold tabular-nums text-ink">
                  {highlights.bestDay}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <span className="text-[12px] text-ink-3">Longest session</span>
                <span className="text-[15px] font-semibold tabular-nums text-ink">
                  {highlights.longestSession}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <span className="text-[12px] text-ink-3">Average session</span>
                <span className="text-[15px] font-semibold tabular-nums text-ink">
                  {highlights.averageSession}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-3">Active days</span>
                <span className="text-[15px] font-semibold tabular-nums text-ink">
                  {highlights.activeDays}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CURRENT STREAKS */}
        <div className="col-span-4 frost p-5 rounded-[20px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-semibold text-ink">Current streaks</h3>
            <span className="text-[12px] text-ink-3">Active habits</span>
          </div>
          {habits.filter((h) => (h.current_streak || 0) > 0).length === 0 ? (
            <div className="py-6 text-center text-[13px] text-ink-3">
              No active streaks right now. Check off your habits today to start!
            </div>
          ) : (
            <div className="space-y-2">
              {habits
                .filter((h) => (h.current_streak || 0) > 0)
                .sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0))
                .slice(0, 4)
                .map((h) => (
                  <div
                    key={h.id}
                    className="bg-surface-2/60 rounded-[12px] px-3 py-2 flex items-center justify-between gap-2 border border-line"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[16px]">{h.icon || '🎯'}</span>
                      <span className="text-[13px] font-medium text-ink truncate">{h.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[13px] tabular-nums font-semibold text-accent shrink-0">
                      <Flame size={14} className="fill-accent text-accent" />
                      <span>{h.current_streak}d</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* AI SUMMARY */}
        <div className="col-span-4 frost p-5 rounded-[20px] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-text mb-2">
              <Sparkles size={16} />
              <span>AI SUMMARY</span>
            </div>
            <p className="text-[14px] leading-[22px] text-ink mt-2">
              {currentStats.totalMinutes > 0 || tasksDoneCount > 0
                ? `You have logged ${fmtMin(currentStats.totalMinutes)} of focus across ${currentStats.sessions} sessions this ${kind}, with ${tasksDoneCount} tasks completed and ${habitConsistencyPct}% habit consistency. Keep leaning into your peak focus window around 9 PM to sustain momentum.`
                : 'Start logging tasks, completing habits, or beginning focus sessions to receive your personalized AI performance summary.'}
            </p>
          </div>
        </div>

        {/* ROW 5: Weekly Report (Full width) */}
        <div className="col-span-12 frost p-6 rounded-[20px] flex items-center justify-between gap-6">
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-text">
              WEEKLY REPORT
            </div>
            <div className="font-display text-[24px] text-ink mt-1">
              {weeklyReport?.title || 'Your Catalyst Weekly Intelligence'}
            </div>
            <p className="text-[14px] leading-[22px] text-ink-2 line-clamp-3 mt-1.5 max-w-3xl">
              {weeklyReport?.summary ||
                'Get deep behavioral reflections, your week-over-week trends, and strategic habit optimizations generated every Sunday.'}
            </p>
          </div>
          <div className="shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={openReportModal}
            >
              Read full report
            </Button>
          </div>
        </div>
      </div>

      {/* Roadmap Modal (lg, glass-strong liquid) */}
      <Modal
        isOpen={isLevelsModalOpen}
        onClose={() => setIsLevelsModalOpen(false)}
        size="lg"
        title="Focus Level Roadmap"
        subtitle="Earn XP from focus, habits and tasks."
      >
        <div className="relative py-4 max-h-[70vh] overflow-y-auto px-2">
          {/* Vertical timeline 2px rail at left 13px */}
          <div className="absolute left-[13px] top-6 bottom-6 w-[2px] bg-line" />

          <div className="space-y-4">
            {LEVELS.map((lvl) => {
              const isCompleted = levelInfo.level > lvl.level;
              const isCurrent = levelInfo.level === lvl.level;
              const isLocked = levelInfo.level < lvl.level;

              if (isCurrent) {
                return (
                  <div
                    key={lvl.level}
                    ref={currentLevelRowRef}
                    className="relative flex items-start gap-4 min-h-[64px]"
                  >
                    {/* Current 28px circle */}
                    <div
                      className="relative z-10 w-7 h-7 rounded-full bg-primary text-snow flex items-center justify-center font-bold text-[13px] shrink-0 ring-4 ring-primary/20"
                    >
                      {lvl.level}
                    </div>

                    <div className="flex-1 pt-0.5">
                      <div className="text-[15px] font-semibold text-primary-text">
                        Level {lvl.level} · {lvl.title}
                      </div>

                      {/* Inner box */}
                      <div className="rounded-[14px] border border-primary/30 bg-surface-2 p-3.5 mt-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[13px] tabular-nums font-semibold text-ink">
                            {totalXP.toLocaleString()} XP / {levelInfo.nextXp.toLocaleString()} XP base
                          </span>
                          <span className="text-[12px] font-medium text-primary-text">
                            {Math.round(levelInfo.progress * 100)}%
                          </span>
                        </div>

                        {/* 6px bar */}
                        <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden mt-2">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#3781FC] to-[#1951FC]"
                            style={{ width: `${Math.round(levelInfo.progress * 100)}%` }}
                          />
                        </div>

                        <div className="text-[12px] text-primary-text font-medium mt-2">
                          {lvl.level === 15
                            ? 'Limitless reached'
                            : `${levelInfo.remaining.toLocaleString()} XP remaining to Level ${lvl.level + 1}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (isCompleted) {
                return (
                  <div
                    key={lvl.level}
                    className="relative flex items-start gap-4 min-h-[52px]"
                  >
                    {/* Completed 28px circle */}
                    <div className="relative z-10 w-7 h-7 rounded-full bg-success text-snow flex items-center justify-center shrink-0">
                      <Check size={14} strokeWidth={2.5} />
                    </div>

                    <div className="flex-1 pt-0.5">
                      <div className="text-[15px] font-semibold text-ink">
                        Level {lvl.level} · {lvl.title}
                      </div>
                      <div className="text-[13px] text-ink-3 tabular-nums mt-0.5">
                        {lvl.xp.toLocaleString()} XP required
                      </div>
                    </div>
                  </div>
                );
              }

              // Locked level
              return (
                <div
                  key={lvl.level}
                  className="relative flex items-start gap-4 min-h-[52px]"
                >
                  {/* Locked 28px circle */}
                  <div className="relative z-10 w-7 h-7 rounded-full bg-surface-2 border border-line text-ink-3 flex items-center justify-center shrink-0">
                    <Lock size={13} />
                  </div>

                  <div className="flex-1 pt-0.5">
                    <div className="text-[15px] font-semibold text-ink-2">
                      Level {lvl.level} · {lvl.title}
                    </div>
                    <div className="text-[13px] text-ink-3 tabular-nums mt-0.5">
                      {lvl.xp.toLocaleString()} XP required
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Full Weekly Report Modal (>= 1024px) */}
      {isReportModalOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(3,25,91,0.35)] backdrop-blur-sm p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeReportModal();
          }}
        >
          <div ref={dialogRef} className="max-w-full">
            {reportLoading ? (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="fx-report-title"
                className="glass-strong flex h-[min(88vh,920px)] w-[min(1080px,92vw)] flex-col overflow-hidden rounded-3xl border border-[var(--line)] shadow-2xl"
              >
                <header className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-8 py-6">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ink-3)]">Weekly report</p>
                    <h2 id="fx-report-title" className="mt-1 font-display text-3xl text-[var(--ink)]">Creating your report</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeReportModal}
                      aria-label="Close report"
                      className="grid size-9 place-items-center rounded-xl text-[var(--ink-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </header>

                <div className="grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)]">
                  <aside className="space-y-6 overflow-y-auto border-r border-[var(--line)] p-8">
                    <div className="flex flex-col items-center text-center">
                      <Skeleton className="size-44 rounded-full" />
                      <Skeleton className="mt-4 h-7 w-36 rounded-lg" />
                      <Skeleton className="mt-2 h-4 w-28 rounded-md" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full rounded-2xl" />
                      <Skeleton className="h-12 w-full rounded-2xl" />
                      <Skeleton className="h-12 w-full rounded-2xl" />
                    </div>
                    <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5">
                      <Skeleton className="h-4 w-20 rounded-md" />
                      <Skeleton className="h-8 w-full rounded-lg" />
                      <Skeleton className="h-8 w-full rounded-lg" />
                    </div>
                  </aside>

                  <main className="space-y-8 overflow-y-auto p-8">
                    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6 space-y-3">
                      <Skeleton className="h-6 w-32 rounded-lg" />
                      <Skeleton className="h-4 w-full rounded-md" />
                      <Skeleton className="h-4 w-5/6 rounded-md" />
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                    </section>
                    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6 space-y-3">
                      <Skeleton className="h-6 w-40 rounded-lg" />
                      <Skeleton className="h-4 w-full rounded-md" />
                      <Skeleton className="h-4 w-4/5 rounded-md" />
                      <Skeleton className="h-4 w-2/3 rounded-md" />
                    </section>
                  </main>
                </div>
              </div>
            ) : reportError || !reportViewData ? (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="fx-report-title"
                className="glass-strong flex h-[min(88vh,920px)] w-[min(1080px,92vw)] flex-col overflow-hidden rounded-3xl border border-[var(--line)] shadow-2xl"
              >
                <header className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-8 py-6">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ink-3)]">Weekly report</p>
                    <h2 id="fx-report-title" className="mt-1 font-display text-3xl text-[var(--ink)]">Weekly report</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeReportModal}
                      aria-label="Close report"
                      className="grid size-9 place-items-center rounded-xl text-[var(--ink-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </header>
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <p className="max-w-md text-base leading-7 text-[var(--ink-2)]">
                    Your report could not be created right now. Please try again in a few minutes.
                  </p>
                  <button
                    type="button"
                    onClick={fetchReport}
                    className="mt-6 inline-flex h-10 items-center rounded-xl bg-[linear-gradient(90deg,#0B2CB1,#1951FC)] px-5 text-sm font-medium text-snow shadow-sm transition hover:brightness-110"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              <DesktopWeeklyReport
                report={reportViewData}
                isPro={isPaidPlan(userPlan)}
                onClose={closeReportModal}
                onUpgrade={() => router.push('/paywall')}
              />
            )}
          </div>
        </div>
      )}

      {/* Level-up celebration modal */}
      {showLevelUpModal && (
        <LevelUpModal
          level={{
            level: levelInfo.level,
            title: levelInfo.title,
            xp: levelInfo.floorXp,
          }}
          onClose={() => setShowLevelUpModal(false)}
        />
      )}
    </div>
  );
}
