import { supabase } from '../utils/supabase';
import { LEVEL_BENCHMARKS } from '../utils/xpService';
import { calculateProductivityScore } from '../utils/analytics';
import { queryCache } from '../utils/queryCache';

export interface AuthorizedUserContext {
  user: {
    id: string;
    full_name: string | null;
    profile_type: 'student' | 'professional' | 'freelancer' | 'creator' | 'entrepreneur' | string | null;
    plan: string;
    isProEntitled: boolean;
    total_xp: number;
    current_level: number;
    current_title: string;
    next_level_name: string | null;
    next_level_xp_requirement: number | null;
    xp_remaining_to_next: number;
    timezone: string;
    ai_message_count: number;
    last_message_date: string | null;
  };
  subscription: {
    status: string | null;
    plan: string | null;
    is_active: boolean;
  };
  productivity_score_access: 'authorized_pro_plan' | 'restricted_free_plan';
  productivity_score?: number | null;
  productivity_score_breakdown?: {
    focusPoints: number;
    taskPoints: number;
    habitPoints: number;
  } | null;
  summary_metrics: {
    exact_active_tasks_count: number;
    exact_completed_tasks_count_last_7_days: number;
    exact_total_focus_minutes_last_7_days: string;
    focus_minutes_numeric_last_7_days: number;
    data_integrity_notice: string;
  };
  tasks: {
    exact_active_tasks_count: number;
    exact_completed_tasks_count_last_7_days: number;
    active_tasks: Array<{
      id: string;
      title: string;
      description?: string | null;
      due_date?: string | null;
      due_time?: string | null;
      priority: 'high' | 'medium' | 'low';
      is_flagged?: boolean;
      tags?: string[] | null;
      start_time?: string | null;
      end_time?: string | null;
    }>;
    recently_completed_14d: Array<{
      id: string;
      title: string;
      completed_at?: string | null;
      due_date?: string | null;
      priority: string;
    }>;
    total_completed_14d: number;
    total_active: number;
  };
  habits: {
    habit_items: Array<{
      id: string;
      name: string;
      frequency: string;
      custom_days?: number[] | null;
      current_streak: number;
      longest_streak: number;
      exact_current_streak_days: number;
      exact_total_completed_days_all_time: number;
      tracking_mode_note: string;
      is_active: boolean;
      total_completions_30d: number;
      completion_rate_30d_percent: number;
      missed_days_count_30d: number;
      weekday_miss_distribution: Record<string, number>;
      recurring_miss_pattern?: string | null;
    }>;
    all_habit_names: string[];
  };
  focus_sessions: {
    exact_total_focus_minutes_last_7_days: string;
    total_focus_minutes_all_time: number;
    weekly_focus_minutes: number;
    recent_sessions: Array<{
      id: string;
      focus_minutes: number;
      completed_at: string;
      was_completed: boolean;
    }>;
  };
  xp_logs: Array<{
    amount: number;
    source: string;
    created_at: string;
  }>;
  countdowns: Array<{
    id: string;
    event_name: string;
    target_date: string;
    days_remaining: number;
    is_active: boolean;
  }>;
  calendar_events: Array<{
    id: string;
    title: string;
    day: string;
    start_time?: string | null;
    end_time?: string | null;
    all_day?: boolean;
  }>;
  notes_and_voice_notes: Array<{
    id: string;
    title: string;
    note_type: 'text' | 'voice';
    content_summary?: string | null;
    transcript?: string | null;
    updated_at: string;
  }>;
  system_clock: {
    current_iso: string;
    current_local_date: string;
    current_day_of_week: string;
    user_timezone: string;
    reference_guide: string;
  };
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Safely fetches authorized user data across all tables using Promise.allSettled.
 * Computes exact streaks, miss distributions, level requirements, and subscription entitlements.
 */
export async function fetchAuthorizedUserContext(userId: string): Promise<AuthorizedUserContext> {
  const now = new Date();
  const currentIso = now.toISOString();
  const todayStr = currentIso.split('T')[0];
  const dayOfWeekName = WEEKDAYS[now.getDay()];

  // Date boundaries
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Helper with 2500ms timeout to avoid hanging queries
  const withTimeout = <T extends { data: any }>(promise: PromiseLike<T>, ms = 2500): Promise<T> =>
    Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Context query timeout')), ms)),
    ]);

  // Execute database queries safely in parallel with strict userId isolation
  const [
    userResult,
    subResult,
    activeTasksResult,
    completedTasksResult,
    habitsResult,
    habitLogsResult,
    allHabitLogsResult,
    pomodoroResult,
    dailyFocusResult,
    xpLogsResult,
    countdownsResult,
    remindersResult,
    notesResult,
  ] = await Promise.allSettled([
    // 1. User profile
    withTimeout(
      supabase
        .from('users')
        .select('id, full_name, profile_type, plan, total_xp, current_level, current_title, timezone, ai_message_count, last_message_date')
        .eq('id', userId)
        .maybeSingle()
    ),

    // 2. Subscriptions
    withTimeout(
      supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ),

    // 3. Active tasks (strictly scoped to userId)
    withTimeout(
      supabase
        .from('tasks')
        .select('id, title, description, due_date, due_time, priority, is_flagged, is_completed, tags, start_time, end_time')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(50)
    ),

    // 4. Recently completed tasks (last 14 days)
    withTimeout(
      supabase
        .from('tasks')
        .select('id, title, completed_at, due_date, priority')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .gte('completed_at', fourteenDaysAgo)
        .order('completed_at', { ascending: false })
        .limit(50)
    ),

    // 5. Habits (strictly scoped to userId)
    withTimeout(
      supabase
        .from('habits')
        .select('id, name, icon, color, frequency, custom_days, current_streak, longest_streak, is_active, created_at')
        .eq('user_id', userId)
        .eq('is_active', true)
    ),

    // 6. Habit logs (last 30 days)
    withTimeout(
      supabase
        .from('habit_logs')
        .select('habit_id, completed_date')
        .eq('user_id', userId)
        .gte('completed_date', thirtyDaysAgo)
    ),

    // 6b. Habit logs (all-time for exact total completed days)
    withTimeout(
      supabase
        .from('habit_logs')
        .select('habit_id, completed_date')
        .eq('user_id', userId)
    ),

    // 7. Pomodoro sessions
    withTimeout(
      supabase
        .from('pomodoro_sessions')
        .select('id, focus_minutes, break_minutes, sets_completed, was_completed, completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(30)
    ),

    // 8. Daily focus activity (fallback/supplementary)
    withTimeout(
      supabase
        .from('daily_focus_activity')
        .select('date, focus_time_minutes')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo)
    ),

    // 9. XP logs
    withTimeout(
      supabase
        .from('xp_logs')
        .select('amount, source, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15)
    ),

    // 10. Countdowns
    withTimeout(
      supabase
        .from('countdowns')
        .select('id, event_name, target_date, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('target_date', { ascending: true })
    ),

    // 11. Reminders / Calendar events
    withTimeout(
      supabase
        .from('reminders')
        .select('id, title, day, start_time, end_time, all_day')
        .eq('user_id', userId)
        .order('day', { ascending: true })
        .limit(25)
    ),

    // 12. Notes & voice notes
    withTimeout(
      supabase
        .from('notes')
        .select('id, title, content, content_text, transcript, note_type, updated_at')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .limit(15)
    ),
  ]);

  // Log any query errors to aid diagnosis
  if (userResult.status === 'rejected') console.warn('[focalystContext] User query failed:', userResult.reason);
  if (subResult.status === 'rejected') console.warn('[focalystContext] Subscription query failed:', subResult.reason);
  if (activeTasksResult.status === 'rejected') console.warn('[focalystContext] Active tasks query failed:', activeTasksResult.reason);
  if (completedTasksResult.status === 'rejected') console.warn('[focalystContext] Completed tasks query failed:', completedTasksResult.reason);
  if (habitsResult.status === 'rejected') console.warn('[focalystContext] Habits query failed:', habitsResult.reason);
  if (habitLogsResult.status === 'rejected') console.warn('[focalystContext] Habit logs query failed:', habitLogsResult.reason);
  if (allHabitLogsResult.status === 'rejected') console.warn('[focalystContext] All habit logs query failed:', allHabitLogsResult.reason);

  // Extract user profile safely
  const userData = userResult.status === 'fulfilled' && userResult.value.data ? userResult.value.data : null;
  const rawPlan = userData?.plan || 'free';
  const totalXp = Number(userData?.total_xp || 0);

  // Extract subscription safely
  const subData = subResult.status === 'fulfilled' && subResult.value.data ? subResult.value.data : null;
  const isSubActive = subData?.status === 'active';
  const isProEntitled = isSubActive || rawPlan === 'pro_monthly' || rawPlan === 'pro_yearly' || rawPlan === 'lifetime';

  // Find canonical level & requirements
  let currentLevelIdx = 0;
  for (let i = LEVEL_BENCHMARKS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_BENCHMARKS[i].xp) {
      currentLevelIdx = i;
      break;
    }
  }
  const currentBench = LEVEL_BENCHMARKS[currentLevelIdx];
  const nextBench = currentLevelIdx < LEVEL_BENCHMARKS.length - 1 ? LEVEL_BENCHMARKS[currentLevelIdx + 1] : null;
  const xpRemainingToNext = nextBench ? Math.max(0, nextBench.xp - totalXp) : 0;

  // Process Tasks
  const activeTasks = (activeTasksResult.status === 'fulfilled' && activeTasksResult.value.data ? activeTasksResult.value.data : []) as any[];
  const completedTasks = (completedTasksResult.status === 'fulfilled' && completedTasksResult.value.data ? completedTasksResult.value.data : []) as any[];

  // Process Habits & 30-day Miss Distribution
  const habitsRaw = (habitsResult.status === 'fulfilled' && habitsResult.value.data ? habitsResult.value.data : []) as any[];
  const habitLogsRaw = (habitLogsResult.status === 'fulfilled' && habitLogsResult.value.data ? habitLogsResult.value.data : []) as any[];
  const allHabitLogsRaw = (allHabitLogsResult.status === 'fulfilled' && allHabitLogsResult.value.data ? allHabitLogsResult.value.data : []) as any[];

  // Map of all-time completed dates per habit: habit_id -> Set of 'YYYY-MM-DD'
  const allTimeCompletionMap = new Map<string, Set<string>>();
  for (const log of allHabitLogsRaw) {
    if (!allTimeCompletionMap.has(log.habit_id)) {
      allTimeCompletionMap.set(log.habit_id, new Set());
    }
    const cleanDate = String(log.completed_date || '').slice(0, 10);
    if (cleanDate) {
      allTimeCompletionMap.get(log.habit_id)!.add(cleanDate);
    }
  }

  // Map of completed dates per habit: habit_id -> Set of 'YYYY-MM-DD'
  const completionMap = new Map<string, Set<string>>();
  for (const log of habitLogsRaw) {
    if (!completionMap.has(log.habit_id)) {
      completionMap.set(log.habit_id, new Set());
    }
    const cleanDate = String(log.completed_date || '').slice(0, 10);
    if (cleanDate) {
      completionMap.get(log.habit_id)!.add(cleanDate);
    }
  }

  // Generate list of the past 30 days
  const past30Days: Array<{ dateStr: string; weekday: string; dayIndex: number }> = [];
  for (let d = 29; d >= 0; d--) {
    const pastDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dateStr = pastDate.toISOString().split('T')[0];
    const dayIndex = pastDate.getDay();
    past30Days.push({
      dateStr,
      weekday: WEEKDAYS[dayIndex],
      dayIndex,
    });
  }

  // Streak calculator identical to HabitList.tsx
  const computeExactStreak = (completedDatesArray: string[], todayFormatted: string): number => {
    if (!completedDatesArray || completedDatesArray.length === 0) return 0;
    const dateSet = new Set(completedDatesArray.map((d) => String(d).slice(0, 10)));

    const parseToNoon = (ymd: string) => {
      const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    };
    const formatYMD = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const checkDate = parseToNoon(todayFormatted);
    const today = formatYMD(checkDate);
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterday = formatYMD(checkDate);

    let currentStreak = 0;
    let startDate: Date;

    if (dateSet.has(today)) {
      currentStreak = 1;
      startDate = parseToNoon(todayFormatted);
      startDate.setDate(startDate.getDate() - 1);
    } else if (dateSet.has(yesterday)) {
      currentStreak = 0;
      startDate = parseToNoon(todayFormatted);
      startDate.setDate(startDate.getDate() - 1);
    } else {
      return 0;
    }

    while (true) {
      const checkStr = formatYMD(startDate);
      if (dateSet.has(checkStr)) {
        currentStreak += 1;
        startDate.setDate(startDate.getDate() - 1);
      } else {
        break;
      }
    }
    return currentStreak;
  };

  const habitItems = habitsRaw.map((habit) => {
    const completedDates = completionMap.get(habit.id) || new Set<string>();
    const allTimeCompletedDates = allTimeCompletionMap.get(habit.id) || new Set<string>();
    const completedDatesList = Array.from(allTimeCompletedDates);
    const isDaily = habit.frequency === 'daily' || !habit.custom_days || habit.custom_days.length === 0;
    const customDays = Array.isArray(habit.custom_days) ? habit.custom_days : [];

    let totalExpected = 0;
    let totalCompleted = 0;
    const weekdayMisses: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };

    const habitCreatedDate = habit.created_at ? habit.created_at.split('T')[0] : thirtyDaysAgo;

    for (const day of past30Days) {
      if (day.dateStr < habitCreatedDate) continue; // Don't penalize days before habit existed

      const isScheduled = isDaily || customDays.includes(day.dayIndex);
      if (isScheduled) {
        totalExpected++;
        if (completedDates.has(day.dateStr)) {
          totalCompleted++;
        } else {
          weekdayMisses[day.weekday]++;
        }
      }
    }

    const totalMisses = totalExpected - totalCompleted;
    const completionRate = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;

    // Detect prominent recurring weekday miss pattern (e.g., 8 of 9 misses occurred on Wednesdays)
    let recurringPattern: string | null = null;
    if (totalMisses >= 3) {
      let maxMissDay = 'Wednesday';
      let maxMisses = 0;
      for (const [wd, count] of Object.entries(weekdayMisses)) {
        if (count > maxMisses) {
          maxMisses = count;
          maxMissDay = wd;
        }
      }
      if (maxMisses >= 3 && maxMisses / totalMisses >= 0.5) {
        recurringPattern = `${maxMisses} of ${totalMisses} misses occurred on ${maxMissDay}s`;
      }
    }

    // Match exact streak calculation from HabitList.tsx with fallback to column
    const computedStreak = computeExactStreak(completedDatesList, todayStr);
    const currentStreakDays = computedStreak > 0 ? computedStreak : Number(habit.current_streak || 0);
    const totalDaysAllTime = Math.max(allTimeCompletedDates.size, totalCompleted);

    return {
      id: habit.id,
      name: habit.name,
      frequency: habit.frequency || 'daily',
      custom_days: habit.custom_days,
      current_streak: currentStreakDays,
      longest_streak: habit.longest_streak || 0,
      exact_current_streak_days: currentStreakDays,
      exact_total_completed_days_all_time: totalDaysAllTime,
      tracking_mode_note: 'Focalyst tracks daily completion status, current streak days, and total completed days. It does NOT track per-habit session duration or standard deviation.',
      is_active: habit.is_active ?? true,
      total_completions_30d: totalCompleted,
      completion_rate_30d_percent: completionRate,
      missed_days_count_30d: totalMisses,
      weekday_miss_distribution: weekdayMisses,
      recurring_miss_pattern: recurringPattern,
    };
  });

  const allHabitNames = habitsRaw.map((h) => h.name);

  // Process Focus Sessions
  const pomodoroSessions = (pomodoroResult.status === 'fulfilled' && pomodoroResult.value.data ? pomodoroResult.value.data : []) as any[];
  const dailyFocusLogs = (dailyFocusResult.status === 'fulfilled' && dailyFocusResult.value.data ? dailyFocusResult.value.data : []) as any[];

  let weeklyFocusMinutes = 0;
  let totalFocusMinutes = 0;

  for (const s of pomodoroSessions) {
    const mins = (s.focus_minutes || 0) * (s.sets_completed || 1);
    totalFocusMinutes += mins;
    if (s.completed_at && s.completed_at >= sevenDaysAgo) {
      weeklyFocusMinutes += mins;
    }
  }

  // If daily_focus_activity had records, incorporate them if pomodoro was zero
  if (totalFocusMinutes === 0 && dailyFocusLogs.length > 0) {
    for (const d of dailyFocusLogs) {
      const mins = Number(d.focus_time_minutes || 0);
      totalFocusMinutes += mins;
      if (d.date && d.date >= sevenDaysAgo.split('T')[0]) {
        weeklyFocusMinutes += mins;
      }
    }
  }

  // Process Countdowns
  const countdownsRaw = (countdownsResult.status === 'fulfilled' && countdownsResult.value.data ? countdownsResult.value.data : []) as any[];
  const countdownItems = countdownsRaw.map((c) => {
    let daysRemaining = 0;
    if (c.target_date) {
      const targetTime = new Date(c.target_date).getTime();
      const todayTime = new Date(todayStr).getTime();
      daysRemaining = Math.ceil((targetTime - todayTime) / (1000 * 60 * 60 * 24));
    }
    return {
      id: c.id,
      event_name: c.event_name,
      target_date: c.target_date,
      days_remaining: daysRemaining,
      is_active: c.is_active ?? true,
    };
  });

  // Process Calendar Events
  const remindersRaw = (remindersResult.status === 'fulfilled' && remindersResult.value.data ? remindersResult.value.data : []) as any[];
  const calendarEvents = remindersRaw.map((r) => ({
    id: r.id,
    title: r.title,
    day: r.day,
    start_time: r.start_time,
    end_time: r.end_time,
    all_day: r.all_day ?? false,
  }));

  // Process Notes & Voice Notes (compact summaries for sub-second LLM inference)
  const notesRaw = (notesResult.status === 'fulfilled' && notesResult.value.data ? notesResult.value.data : []) as any[];
  const noteItems = notesRaw.slice(0, 8).map((n) => {
    const rawContent = n.content_text || n.content || '';
    const rawTranscript = n.transcript || '';
    return {
      id: n.id,
      title: n.title || 'Untitled Note',
      note_type: (n.note_type === 'voice' ? 'voice' : 'text') as 'text' | 'voice',
      content_summary: rawContent.length > 180 ? `${rawContent.substring(0, 180)}...` : rawContent || null,
      transcript: rawTranscript.length > 180 ? `${rawTranscript.substring(0, 180)}...` : rawTranscript || null,
      updated_at: n.updated_at,
    };
  });

  // Process XP logs
  const xpLogs = (xpLogsResult.status === 'fulfilled' && xpLogsResult.value.data ? xpLogsResult.value.data : []) as any[];

  // Productivity Score Calculation & Entitlement Enforcement (Section 15)
  let productivityScore: number | null = null;
  let breakdown: any = null;

  if (isProEntitled) {
    const weeklyHours = weeklyFocusMinutes / 60;
    const tasksCompletedCount = completedTasks.length;
    const tasksTotalCount = activeTasks.length + tasksCompletedCount;
    let habitsTotal = 0;
    let habitsCompleted = 0;
    for (const h of habitItems) {
      habitsTotal += 7; // weekly expected
      habitsCompleted += Math.min(7, h.total_completions_30d);
    }

    const scoreResult = calculateProductivityScore(
      weeklyHours,
      tasksCompletedCount,
      tasksTotalCount,
      habitsCompleted,
      habitsTotal
    );
    productivityScore = scoreResult.score;
    breakdown = {
      focusPoints: scoreResult.focusPoints,
      taskPoints: scoreResult.taskPoints,
      habitPoints: scoreResult.habitPoints,
    };
  }

  const userTimezone = userData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Compute exact last 7 days completed tasks
  const completedTasksLast7Days = completedTasks.filter((t) => t.completed_at && t.completed_at >= sevenDaysAgo);
  const exactFocusHours = Math.floor(weeklyFocusMinutes / 60);
  const exactFocusRemainingMins = weeklyFocusMinutes % 60;
  const exactFocusFormatted = `${exactFocusHours}h ${exactFocusRemainingMins}m`;

  return {
    user: {
      id: userId,
      full_name: userData?.full_name || null,
      profile_type: userData?.profile_type || null,
      plan: rawPlan,
      isProEntitled,
      total_xp: totalXp,
      current_level: userData?.current_level || currentBench.level,
      current_title: userData?.current_title || currentBench.title,
      next_level_name: nextBench ? nextBench.title : null,
      next_level_xp_requirement: nextBench ? nextBench.xp : null,
      xp_remaining_to_next: xpRemainingToNext,
      timezone: userTimezone,
      ai_message_count: userData?.ai_message_count || 0,
      last_message_date: userData?.last_message_date || null,
    },
    subscription: {
      status: subData?.status || (rawPlan !== 'free' ? 'active' : 'inactive'),
      plan: subData?.plan || rawPlan,
      is_active: isProEntitled,
    },
    productivity_score_access: isProEntitled ? 'authorized_pro_plan' : 'restricted_free_plan',
    ...(isProEntitled
      ? {
          productivity_score: productivityScore,
          productivity_score_breakdown: breakdown,
        }
      : {}),
    summary_metrics: {
      exact_active_tasks_count: activeTasks.length,
      exact_completed_tasks_count_last_7_days: completedTasksLast7Days.length,
      exact_total_focus_minutes_last_7_days: exactFocusFormatted,
      focus_minutes_numeric_last_7_days: weeklyFocusMinutes,
      data_integrity_notice: 'These summary numbers are exact authentic values from the database. NEVER extrapolate or hallucinate different numbers.',
    },
    tasks: {
      exact_active_tasks_count: activeTasks.length,
      exact_completed_tasks_count_last_7_days: completedTasksLast7Days.length,
      active_tasks: activeTasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        due_date: t.due_date,
        due_time: t.due_time,
        priority: (['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium') as 'high' | 'medium' | 'low',
        is_flagged: t.is_flagged,
        tags: t.tags,
        start_time: t.start_time,
        end_time: t.end_time,
      })),
      recently_completed_14d: completedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        completed_at: t.completed_at,
        due_date: t.due_date,
        priority: t.priority,
      })),
      total_completed_14d: completedTasks.length,
      total_active: activeTasks.length,
    },
    habits: {
      habit_items: habitItems,
      all_habit_names: allHabitNames,
    },
    focus_sessions: {
      exact_total_focus_minutes_last_7_days: exactFocusFormatted,
      total_focus_minutes_all_time: totalFocusMinutes,
      weekly_focus_minutes: weeklyFocusMinutes,
      recent_sessions: pomodoroSessions.slice(0, 10).map((s) => ({
        id: s.id,
        focus_minutes: s.focus_minutes,
        completed_at: s.completed_at,
        was_completed: s.was_completed,
      })),
    },
    xp_logs: xpLogs.map((x) => ({
      amount: x.amount,
      source: x.source,
      created_at: x.created_at,
    })),
    countdowns: countdownItems,
    calendar_events: calendarEvents,
    notes_and_voice_notes: noteItems,
    system_clock: {
      current_iso: currentIso,
      current_local_date: todayStr,
      current_day_of_week: dayOfWeekName,
      user_timezone: userTimezone,
      reference_guide: `Today is ${dayOfWeekName}, ${todayStr} (Timezone: ${userTimezone}). Always use this exact date as the reference point for terms like "today", "tomorrow", "next Monday", etc.`,
    },
  };
}
