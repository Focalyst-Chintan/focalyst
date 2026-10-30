import { supabase } from './supabase';
import { isProPlan } from './plan';

export interface Level {
  level: number;
  name: string;
  minHours: number;
  icon: string;
}

export const FOCUS_LEVELS: Level[] = [
  { level: 1, name: 'Ignition', minHours: 0, icon: 'flash' },
  { level: 2, name: 'Momentum', minHours: 2, icon: 'speedometer' },
  { level: 3, name: 'Builder', minHours: 5, icon: 'hammer' },
  { level: 4, name: 'Practitioner', minHours: 10, icon: 'book' },
  { level: 5, name: 'Disciplined', minHours: 20, icon: 'shield-checkmark' },
  { level: 6, name: 'Focused', minHours: 35, icon: 'eye' },
  { level: 7, name: 'Flow', minHours: 50, icon: 'water' },
  { level: 8, name: 'Operator', minHours: 75, icon: 'cog' },
  { level: 9, name: 'Achiever', minHours: 100, icon: 'trophy' },
  { level: 10, name: 'Strategist', minHours: 150, icon: 'compass' },
  { level: 11, name: 'Mastery', minHours: 200, icon: 'ribbon' },
  { level: 12, name: 'Elite', minHours: 300, icon: 'medal' },
  { level: 13, name: 'Apex', minHours: 500, icon: 'triangle' },
  { level: 14, name: 'Legend', minHours: 750, icon: 'sparkles' },
  { level: 15, name: 'Limitless', minHours: 1000, icon: 'infinite' },
];

/**
 * Gets the user's level based on total hours focused.
 */
export function getCurrentLevel(totalHours: number) {
  let activeIndex = 0;
  for (let i = FOCUS_LEVELS.length - 1; i >= 0; i--) {
    if (totalHours >= FOCUS_LEVELS[i].minHours) {
      activeIndex = i;
      break;
    }
  }

  const currentLevel = FOCUS_LEVELS[activeIndex];
  const nextLevel = activeIndex < FOCUS_LEVELS.length - 1 ? FOCUS_LEVELS[activeIndex + 1] : null;

  let progress = 100;
  let hoursToNext = 0;

  if (nextLevel) {
    const range = nextLevel.minHours - currentLevel.minHours;
    const completed = totalHours - currentLevel.minHours;
    progress = Math.max(0, Math.min(100, (completed / range) * 100));
    hoursToNext = Math.max(0, nextLevel.minHours - totalHours);
  }

  return {
    currentLevel,
    nextLevel,
    progress,
    hoursToNext,
  };
}

/**
 * Calculates strict calendar-week date range for the previous week (Monday 00:00:00 to Sunday 23:59:59).
 * Returns strict ISO strings.
 */
export function getLastWeekRange() {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days to subtract to reach the current week's Monday
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
  
  // Construct current week's Monday 00:00:00 in local timezone
  const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday, 0, 0, 0, 0);
  
  // Last week's Monday is 7 days prior
  const lastMonday = new Date(currentMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Last week's Sunday is 6 days after last week's Monday at 23:59:59.999
  const lastSunday = new Date(lastMonday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  
  return {
    start: lastMonday.toISOString(),
    end: lastSunday.toISOString(),
  };
}

/**
 * Weighted Productivity Score algorithm:
 * Focus Points (40%): Math.min((weeklyFocusHours / 20) * 40, 40)
 * Task Points (30%): (tasksCompleted / tasksTotal) * 30
 * Habit Points (30%): (habitsCompleted / habitsTotal) * 30
 * Total Score = Math.round(focusPoints + taskPoints + habitPoints).
 */
export function calculateProductivityScore(
  weeklyFocusHours: number,
  tasksCompleted: number,
  tasksTotal: number,
  habitsCompleted: number,
  habitsTotal: number
): {
  score: number;
  focusPoints: number;
  taskPoints: number;
  habitPoints: number;
} {
  const focusPoints = Math.min((weeklyFocusHours / 20) * 40, 40);
  const taskPoints = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 30 : 0;
  const habitPoints = habitsTotal > 0 ? (habitsCompleted / habitsTotal) * 30 : 0;
  
  const score = Math.round(focusPoints + taskPoints + habitPoints);
  
  return {
    score: Math.max(0, Math.min(100, score)),
    focusPoints,
    taskPoints,
    habitPoints,
  };
}

/**
 * Fetches the user's total focus minutes from profiles/users table, or sums sessions as fallback.
 * Returns total hours.
 */
export async function fetchTotalFocusHours(userId: string): Promise<number> {
  try {
    // Precise calculation from daily_focus_activity
    const { data: dailyActivity, error: dailyErr } = await supabase
      .from('daily_focus_activity')
      .select('focus_time_minutes')
      .eq('user_id', userId);
      
    if (!dailyErr && dailyActivity && dailyActivity.length > 0) {
      const total_minutes = dailyActivity.reduce((acc, a) => acc + (a.focus_time_minutes || 0), 0);
      const total_hours_decimal = total_minutes / 60;
      return total_hours_decimal;
    }

    // Fallbacks
    // 1. Try profiles table
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('total_focus_minutes')
      .eq('id', userId)
      .single();
      
    if (!profileErr && profileData && typeof profileData.total_focus_minutes === 'number') {
      return profileData.total_focus_minutes / 60;
    }
    
    // 2. Try users table
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('total_focus_minutes')
      .eq('id', userId)
      .single();
      
    if (!userErr && userData && typeof userData.total_focus_minutes === 'number') {
      return userData.total_focus_minutes / 60;
    }
    
    // 3. Fallback: Aggregate all focus time from pomodoro_sessions
    const { data: pomoSessions, error: pomoErr } = await supabase
      .from('pomodoro_sessions')
      .select('focus_minutes, sets_completed')
      .eq('user_id', userId);
      
    if (!pomoErr && pomoSessions) {
      const mins = pomoSessions.reduce((acc, s) => {
        const sets = (s.sets_completed && s.sets_completed > 0) ? s.sets_completed : 1;
        return acc + ((s.focus_minutes || 0) * sets);
      }, 0);
      return mins / 60;
    }
    
    return 0;
  } catch (err) {
    console.error('Error fetching total focus hours:', err);
    return 0;
  }
}

/**
 * Fetches user subscription plan details.
 */
export async function fetchUserPlan(userId: string): Promise<'free' | 'pro'> {
  try {
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('plan, plan_expires_at')
      .eq('id', userId)
      .single();
      
    if (!userErr && userData) {
      if (isProPlan(userData.plan, userData.plan_expires_at)) {
        return 'pro';
      }
    }
    return 'free';
  } catch {
    return 'free';
  }
}

/**
 * Aggregates calendar week stats using Promise.all Supabase queries with strict error handling.
 */
export async function fetchWeeklyData(userId: string) {
  const { start, end } = getLastWeekRange();
  
  try {
    const [focusRes, tasksRes, logsRes, habitsRes] = await Promise.all([
      // A. Fetch focus time
      (async () => {
        try {
          const { data, error } = await supabase
            .from('focus_sessions')
            .select('duration_minutes')
            .eq('user_id', userId)
            .gte('created_at', start)
            .lte('created_at', end);
          if (error) throw error;
          return data || [];
        } catch {
          // Fallback to pomodoro_sessions
          const { data, error } = await supabase
            .from('pomodoro_sessions')
            .select('focus_minutes, sets_completed')
            .eq('user_id', userId)
            .gte('completed_at', start)
            .lte('completed_at', end);
          if (error) return [];
          return (data || []).map(s => {
            const sets = (s.sets_completed && s.sets_completed > 0) ? s.sets_completed : 1;
            return { duration_minutes: (s.focus_minutes || 0) * sets };
          });
        }
      })(),

      // B. Fetch tasks completed vs total
      (async () => {
        try {
          const { data, error } = await supabase
            .from('tasks')
            .select('id, status')
            .eq('user_id', userId)
            .gte('created_at', start)
            .lte('created_at', end);
          if (error) throw error;
          return data || [];
        } catch {
          // Fallback to standard tasks select is_completed
          const { data, error } = await supabase
            .from('tasks')
            .select('id, is_completed')
            .eq('user_id', userId);
          if (error) return [];
          return (data || []).map(t => ({ id: t.id, status: t.is_completed ? 'completed' : 'pending' }));
        }
      })(),

      // C. Fetch completed habit logs in this range
      supabase
        .from('habit_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('completed_date', start.split('T')[0])
        .lte('completed_date', end.split('T')[0])
        .then(res => {
          if (res.error) return [];
          return res.data;
        }),

      // D. Fetch total active habits count to determine scheduled habit logs
      supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .then(res => {
          if (res.error) return [];
          return res.data;
        })
    ]);

    // Aggregate Focus Minutes
    const weeklyFocusMinutes = focusRes.reduce((acc: number, f: any) => acc + (f.duration_minutes || 0), 0);

    // Aggregate Tasks
    const tasksTotal = tasksRes.length;
    const tasksCompleted = tasksRes.filter((t: any) => t.status === 'completed' || t.status === 'done' || t.is_completed === true).length;

    // Aggregate Habits
    const activeHabitsCount = habitsRes.length;
    const habitsTotal = Math.max(1, activeHabitsCount * 7); // total scheduled in a week (7 days per habit)
    const habitsCompleted = logsRes.length;

    return {
      weeklyFocusMinutes,
      tasksCompleted,
      tasksTotal,
      habitsCompleted,
      habitsTotal,
    };
  } catch (err) {
    console.error('Error in Promise.all weekly fetch block:', err);
    return {
      weeklyFocusMinutes: 0,
      tasksCompleted: 0,
      tasksTotal: 0,
      habitsCompleted: 0,
      habitsTotal: 0,
    };
  }
}
