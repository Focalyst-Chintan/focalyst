'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { createClient } from '@/lib/supabase';
import { localDateStr, addDaysYMD } from '@/lib/utils/date';
import { getPeriod, PeriodKind } from '@/lib/utils/period';
import { useFocusStats } from '@/hooks/useFocusStats';
import { onDataChanged } from '@/lib/events';
import { getLevelFromXP, LEVEL_BENCHMARKS } from '@/lib/utils/levels';
import { calculateProductivityScore } from '@/lib/utils/insights';
import { LevelUpModal } from '@/components/insights/LevelUpModal';
import WeeklyReportView from '@/components/insights/WeeklyReportView';

// Desktop UI
import { Button } from '@/components/desktop/ui/Button';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { SegmentedControl } from '@/components/desktop/ui/SegmentedControl';
import { Modal } from '@/components/desktop/ui/Modal';
import { ProgressRing } from '@/components/desktop/ui/ProgressRing';
import { Skeleton } from '@/components/desktop/ui/Skeleton';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
  RotateCw,
  Clock,
  Layers,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';

function formatFocusTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hrs}h`;
  return `${hrs}h ${remaining}m`;
}

function formatHour12(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
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
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  const [weeklyReport, setWeeklyReport] = useState<any | null>(null);
  const [weeklyReportAvailable, setWeeklyReportAvailable] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLevelsModalOpen, setIsLevelsModalOpen] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

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

  // Query Focus Stats for current & previous elapsed range for fair comparisons
  const currentStats = useFocusStats(period.from, period.effectiveTo);
  const prevStats = useFocusStats(period.prevFrom, period.prevTo);

  // Fetch full period focus stats for bar chart display
  const fullPeriodStats = useFocusStats(period.from, period.to);

  // Load user XP, plan & weekly reports
  const loadInsightsMeta = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('plan, total_xp')
        .eq('id', user.id)
        .single();

      if (profile) {
        setTotalXP(profile.total_xp || 0);
        setUserPlan(profile.plan !== 'free' ? 'pro' : 'free');
      }

      // Check weekly report
      const { data: reports } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (reports && reports.length > 0) {
        setWeeklyReport(reports[0]);
        setWeeklyReportAvailable(true);
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

  // Level calculations
  const levelState = useMemo(() => getLevelFromXP(totalXP), [totalXP]);

  // Tasks done in [period.from, period.effectiveTo]
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

  // Habit consistency calculation in [from, effectiveTo]
  const { habitConsistencyPct, prevHabitConsistencyPct, habitBreakdown } = useMemo(() => {
    if (habits.length === 0) {
      return { habitConsistencyPct: 0, prevHabitConsistencyPct: 0, habitBreakdown: [] };
    }

    // Days elapsed in current period
    let daysCount = 0;
    let cur = period.from;
    const currentDates: string[] = [];
    while (cur <= period.effectiveTo) {
      currentDates.push(cur);
      cur = addDaysYMD(cur, 1);
      daysCount++;
    }

    // Previous dates
    let prevCur = period.prevFrom;
    const prevDates: string[] = [];
    while (prevCur <= period.prevTo) {
      prevDates.push(prevCur);
      prevCur = addDaysYMD(prevCur, 1);
    }

    let currentCompletedCount = 0;
    let prevCompletedCount = 0;

    const breakdown = habits.map((h) => {
      const dates = h.completedDates || [];
      const currentHits = dates.filter((d) => d >= period.from && d <= period.effectiveTo).length;
      const prevHits = dates.filter((d) => d >= period.prevFrom && d <= period.prevTo).length;

      currentCompletedCount += currentHits;
      prevCompletedCount += prevHits;

      const pct = Math.min(100, Math.round((currentHits / Math.max(1, daysCount)) * 100));
      return {
        id: h.id,
        name: h.name,
        icon: h.icon || '🎯',
        color: h.color || '#3781FC',
        pct,
        logsCount: currentHits,
      };
    });

    const totalScheduled = habits.length * Math.max(1, daysCount);
    const habitConsistencyPct = Math.min(100, Math.round((currentCompletedCount / totalScheduled) * 100));

    const totalPrevScheduled = habits.length * Math.max(1, prevDates.length);
    const prevHabitConsistencyPct = Math.min(100, Math.round((prevCompletedCount / totalPrevScheduled) * 100));

    breakdown.sort((a, b) => b.pct - a.pct);

    return { habitConsistencyPct, prevHabitConsistencyPct, habitBreakdown: breakdown };
  }, [habits, period.from, period.effectiveTo, period.prevFrom, period.prevTo]);

  // Delta helpers
  const computeDelta = (curr: number, prev: number) => {
    if (prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const focusDelta = computeDelta(currentStats.totalMinutes, prevStats.totalMinutes);
  const sessionsDelta = computeDelta(currentStats.sessions, prevStats.sessions);
  const tasksDelta = computeDelta(tasksDoneCount, prevTasksDoneCount);
  const habitsDelta = computeDelta(habitConsistencyPct, prevHabitConsistencyPct);

  // Sparkline data for KPI cards (last 7 data points)
  const sparklineData = useMemo(() => {
    const days: { val: number }[] = [];
    let cur = period.from;
    while (cur <= period.effectiveTo) {
      days.push({ val: currentStats.byDay[cur] || 0 });
      cur = addDaysYMD(cur, 1);
    }
    return days.length > 0 ? days : [{ val: 0 }, { val: 0 }];
  }, [period.from, period.effectiveTo, currentStats.byDay]);

  // BarChart data for Focus Activity
  const focusActivityData = useMemo(() => {
    const list: { day: string; fullDate: string; minutes: number }[] = [];
    let cur = period.from;
    while (cur <= period.to) {
      const d = new Date(cur + 'T12:00:00');
      const dayLabel =
        kind === 'week'
          ? d.toLocaleDateString('en-GB', { weekday: 'short' })
          : String(d.getDate());
      list.push({
        day: dayLabel,
        fullDate: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
        minutes: fullPeriodStats.byDay[cur] || 0,
      });
      cur = addDaysYMD(cur, 1);
    }
    return list;
  }, [period.from, period.to, fullPeriodStats.byDay, kind]);

  // Best focus time calculations
  const { peakHour, peakMinutes, byHourData } = useMemo(() => {
    const arr = fullPeriodStats.byHour || Array(24).fill(0);
    let bestH = 9;
    let maxM = 0;
    arr.forEach((m: number, h: number) => {
      if (m > maxM) {
        maxM = m;
        bestH = h;
      }
    });
    const byHourList = arr.map((m: number, h: number) => ({
      hour: h,
      label: formatHour12(h),
      minutes: m,
    }));
    return { peakHour: bestH, peakMinutes: maxM, byHourData: byHourList };
  }, [fullPeriodStats.byHour]);

  // Productivity score calculation
  const totalTasksInPeriod = tasksDoneCount + tasks.filter((t) => !t.is_completed).length;
  const streakSum = habits.reduce((acc, h) => acc + (h.current_streak || 0), 0);
  const prodScore = calculateProductivityScore(
    tasksDoneCount,
    totalTasksInPeriod,
    streakSum,
    habits.length,
    currentStats.totalMinutes,
    prevStats.totalMinutes
  );

  let grade = 'Grade B';
  if (prodScore >= 90) grade = 'Grade A+';
  else if (prodScore >= 80) grade = 'Grade A';
  else if (prodScore >= 70) grade = 'Grade B+';
  else if (prodScore >= 60) grade = 'Grade B';
  else if (prodScore >= 50) grade = 'Grade C';
  else grade = 'Grade D';

  return (
    <div className="pb-16 max-w-[1280px] mx-auto">
      {/* SVG Gradients for Charts */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="fxSparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3781FC" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#3781FC" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fxFocusBarGrad" x1="0" y1="0" x2="0" y2="1">
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
        {/* ROW 1: 4 KPI Cards */}
        {/* KPI 1: Focus time */}
        <div className="col-span-3 frost p-5 rounded-[20px] flex flex-col justify-between h-[152px]">
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
            {formatFocusTime(currentStats.totalMinutes)}
          </div>
          <div className="h-10 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#3781FC"
                  strokeWidth={2}
                  fill="url(#fxSparkGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI 2: Sessions */}
        <div className="col-span-3 frost p-5 rounded-[20px] flex flex-col justify-between h-[152px]">
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
          <div className="h-10 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#3781FC"
                  strokeWidth={2}
                  fill="url(#fxSparkGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI 3: Habit consistency */}
        <div className="col-span-3 frost p-5 rounded-[20px] flex flex-col justify-between h-[152px]">
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
          <div className="h-10 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#3781FC"
                  strokeWidth={2}
                  fill="url(#fxSparkGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI 4: Tasks done */}
        <div className="col-span-3 frost p-5 rounded-[20px] flex flex-col justify-between h-[152px]">
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
          <div className="h-10 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#3781FC"
                  strokeWidth={2}
                  fill="url(#fxSparkGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 2: Focus Activity (8 cols) & Level (4 cols) */}
        {/* FOCUS ACTIVITY */}
        <div className="col-span-8 frost p-5 rounded-[20px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-semibold text-ink">Focus activity</h3>
            <span className="text-[13px] tabular-nums text-ink-2 font-medium">
              Total {formatFocusTime(currentStats.totalMinutes)}
            </span>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={focusActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: 'var(--ink-3)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--ink-3)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 60 ? `${Math.floor(v / 60)}h` : `${v}m`)}
                />
                <RechartsTooltip
                  cursor={{ fill: 'var(--surface-2)', opacity: 0.5 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="glass-strong rounded-[12px] px-3 py-2 text-[13px] text-ink tabular-nums shadow-lg">
                          {data.fullDate} · {formatFocusTime(data.minutes)}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="minutes"
                  fill="url(#fxFocusBarGrad)"
                  barSize={kind === 'week' ? 28 : 10}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LEVEL */}
        <div className="col-span-4 frost p-5 rounded-[20px] flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-text">
              LEVEL {levelState.current.level}
            </div>
            <div className="font-display text-[28px] leading-[34px] text-ink mt-1">
              {levelState.current.title}
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-[12px] text-ink-2 mb-2">
                <span>XP Progress</span>
                <span className="tabular-nums font-medium">{levelState.progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#3781FC] to-[#1951FC] rounded-full transition-all duration-300"
                  style={{ width: `${levelState.progress}%` }}
                />
              </div>
            </div>
            <div className="mt-4 text-[13px] text-ink-2 tabular-nums">
              {levelState.current.level === 15
                ? 'Maximum level reached!'
                : `${formatFocusTime(levelState.xpRemaining)} to Level ${levelState.next.level} · ${levelState.next.title}`}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-line flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsLevelsModalOpen(true)}
            >
              View all levels
            </Button>
          </div>
        </div>

        {/* ROW 3: Best Focus Time (4 cols), Habits (4 cols), Productivity Score (4 cols) */}
        {/* BEST FOCUS TIME */}
        <div className="col-span-4 frost p-5 rounded-[20px] flex flex-col justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-ink mb-3">Best focus time</h3>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byHourData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <Bar dataKey="minutes" barSize={6} radius={[3, 3, 0, 0]}>
                    {byHourData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === peakHour && peakMinutes > 0 ? 'url(#fxFocusBarGrad)' : 'var(--surface-3)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="text-[14px] text-ink mt-2">
            {fullPeriodStats.totalMinutes < 30
              ? 'Not enough sessions yet.'
              : `You focus best around ${formatHour12(peakHour)}`}
          </div>
        </div>

        {/* HABITS */}
        <div className="col-span-4 frost p-5 rounded-[20px]">
          <h3 className="text-[16px] font-semibold text-ink mb-3">Habits</h3>
          {habitBreakdown.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-ink-3">
              No active habits scheduled.
            </div>
          ) : (
            <div className="space-y-2.5">
              {habitBreakdown.slice(0, 6).map((h) => (
                <div key={h.id} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[13px] shrink-0"
                    style={{ backgroundColor: `${h.color}22` }}
                  >
                    {h.icon}
                  </div>
                  <span className="text-[13px] text-ink truncate flex-1">{h.name}</span>
                  <div className="w-20 h-1.5 rounded-full bg-surface-2 overflow-hidden shrink-0">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${h.pct}%`, backgroundColor: h.color }}
                    />
                  </div>
                  <span className="text-[13px] tabular-nums text-ink-2 w-10 text-right shrink-0">
                    {h.pct}%
                  </span>
                </div>
              ))}
              {habitBreakdown.length > 6 && (
                <div className="text-[12px] text-ink-3 pt-1 text-center">
                  +{habitBreakdown.length - 6} more
                </div>
              )}
            </div>
          )}
        </div>

        {/* PRODUCTIVITY SCORE */}
        <div className="col-span-4 frost p-5 rounded-[20px] flex items-center justify-between gap-4">
          <div className="relative flex items-center justify-center">
            <ProgressRing
              progress={prodScore}
              size={120}
              strokeWidth={10}
              className="text-primary"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[32px] font-semibold tabular-nums text-ink leading-none">
                {prodScore}
              </span>
              <span className="text-[11px] font-medium text-ink-3 mt-1">SCORE</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="inline-block px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-primary-soft text-primary-text mb-1">
              {grade}
            </div>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex items-center justify-between text-ink-2">
                <span>Tasks done</span>
                <span className="tabular-nums font-medium text-ink">40%</span>
              </div>
              <div className="flex items-center justify-between text-ink-2">
                <span>Habits</span>
                <span className="tabular-nums font-medium text-ink">35%</span>
              </div>
              <div className="flex items-center justify-between text-ink-2">
                <span>Focus</span>
                <span className="tabular-nums font-medium text-ink">25%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4: Current Streaks (6 cols) & AI Summary (6 cols) */}
        {/* CURRENT STREAKS */}
        <div className="col-span-6 frost p-5 rounded-[20px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-semibold text-ink">Current streaks</h3>
            <span className="text-[12px] text-ink-3">Active habits</span>
          </div>
          {habits.filter((h) => (h.current_streak || 0) > 0).length === 0 ? (
            <div className="py-6 text-center text-[13px] text-ink-3">
              No active streaks right now. Check off your habits today to start!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {habits
                .filter((h) => (h.current_streak || 0) > 0)
                .sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0))
                .slice(0, 4)
                .map((h) => (
                  <div
                    key={h.id}
                    className="bg-surface-2/60 rounded-[14px] p-3 flex items-center justify-between gap-2 border border-line"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[18px]">{h.icon || '🎯'}</span>
                      <span className="text-[14px] font-medium text-ink truncate">{h.name}</span>
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
        <div className="col-span-6 frost p-5 rounded-[20px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-text">
              <Sparkles size={16} />
              <span>AI SUMMARY</span>
            </div>
          </div>
          <p className="text-[14px] leading-[22px] text-ink mt-2">
            {currentStats.totalMinutes > 0 || tasksDoneCount > 0
              ? `You have logged ${formatFocusTime(currentStats.totalMinutes)} of focus across ${currentStats.sessions} sessions this ${kind}, with ${tasksDoneCount} tasks completed and ${habitConsistencyPct}% habit consistency. Keep leaning into your peak focus window around ${formatHour12(peakHour)} to sustain momentum.`
              : 'Start logging tasks, completing habits, or beginning focus sessions to receive your personalized AI performance summary.'}
          </p>
        </div>

        {/* ROW 5: Weekly Report (12 cols) */}
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
              onClick={() => setIsReportModalOpen(true)}
            >
              Read full report
            </Button>
          </div>
        </div>
      </div>

      {/* Levels Roadmap Modal */}
      <Modal
        isOpen={isLevelsModalOpen}
        onClose={() => setIsLevelsModalOpen(false)}
        size="md"
        title="Focus Level Roadmap"
        subtitle="15 levels of focus mastery. Every minute in deep work fuels your XP."
      >
        <div className="py-2 max-h-[60vh] overflow-y-auto space-y-2.5">
          {LEVEL_BENCHMARKS.map((b) => {
            const isReached = totalXP >= b.xp;
            const isCurrent = levelState.current.level === b.level;
            return (
              <div
                key={b.level}
                className={`p-3.5 rounded-[14px] flex items-center justify-between border transition-all ${
                  isCurrent
                    ? 'bg-primary-soft border-primary/30'
                    : isReached
                    ? 'bg-surface-2 border-line'
                    : 'opacity-60 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[13px] ${
                      isCurrent
                        ? 'bg-primary text-snow shadow-md'
                        : isReached
                        ? 'bg-surface-3 text-ink'
                        : 'bg-surface-2 text-ink-3'
                    }`}
                  >
                    #{b.level}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-ink">{b.title}</div>
                    <div className="text-[12px] text-ink-3 tabular-nums">
                      {formatFocusTime(b.xp)} required
                    </div>
                  </div>
                </div>
                {isCurrent && (
                  <span className="text-[11px] font-semibold text-primary-text uppercase tracking-wider">
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Full Weekly Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        size="lg"
        title="Weekly Intelligence Report"
      >
        <div className="max-h-[70vh] overflow-y-auto py-2">
          <WeeklyReportView userPlan={userPlan} />
        </div>
      </Modal>

      {/* Level-up celebration modal */}
      {showLevelUpModal && (
        <LevelUpModal
          level={levelState.current}
          onClose={() => setShowLevelUpModal(false)}
        />
      )}
    </div>
  );
}
