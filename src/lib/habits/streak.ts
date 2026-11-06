/**
 * Canonical Habit Streak Calculation for Focalyst.
 *
 * Rules:
 * - A day counts if the habit has at least one log on that calendar date (YYYY-MM-DD).
 * - Several logs on one day count as one day.
 * - Scheduled days:
 *   - 'daily' (or null/empty custom_days): every day is scheduled.
 *   - 'custom': only days in custom_days (0=Sun, 1=Mon ... 6=Sat, also supporting 7=Sun) count.
 *   - Unscheduled days never break the streak.
 * - Current streak:
 *   - Consecutive scheduled days ending today if today is logged (always >= 1).
 *   - Or ending yesterday (or most recent scheduled day) if today is not logged yet.
 *   - If the last log is before yesterday (or before the most recent scheduled day), current streak is 0.
 * - Best streak:
 *   - Longest consecutive run of days in the full history without missing a scheduled day.
 */

export interface HabitSchedule {
  frequency?: string | null;
  custom_days?: number[] | null;
  repeat_days?: number[] | null;
}

export interface HabitStreakResult {
  currentStreak: number;
  bestStreak: number;
}

/**
 * Returns DOW (0=Sun..6=Sat) for a YYYY-MM-DD string without local timezone shift.
 */
export function getDayOfWeekFromYMD(ymd: string): number {
  const clean = String(ymd || '').slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return new Date().getDay();
  }
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0)).getUTCDay();
}

/**
 * Adds `n` days to a YYYY-MM-DD string safely in UTC.
 */
export function addDaysYMD(ymd: string, n: number): string {
  const clean = String(ymd || '').slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return ymd;
  }
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/**
 * Checks whether a given YYYY-MM-DD date is a scheduled day for the habit.
 */
export function isHabitScheduledOn(habit: HabitSchedule, ymd: string): boolean {
  if (!habit.frequency || habit.frequency === 'daily') {
    return true;
  }
  if (habit.frequency === 'custom') {
    const days = habit.custom_days || habit.repeat_days;
    if (!days || !Array.isArray(days) || days.length === 0) {
      return true;
    }
    const dow = getDayOfWeekFromYMD(ymd); // 0 = Sun .. 6 = Sat
    return days.includes(dow) || (dow === 0 && days.includes(7));
  }
  // Any other/legacy frequency string without custom_days defaults to true
  return true;
}

/**
 * Computes current and best streak for a habit from its completion dates.
 */
export function calculateHabitStreak(
  habit: HabitSchedule,
  completedDates: (string | Date | null | undefined)[],
  todayYMD: string
): HabitStreakResult {
  if (!completedDates || completedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Deduplicate and sanitize dates to YYYY-MM-DD
  const dateSet = new Set<string>();
  for (const d of completedDates) {
    if (!d) continue;
    const clean = String(d).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      dateSet.add(clean);
    }
  }

  const sortedDates = Array.from(dateSet).sort();
  if (sortedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // 1. Current streak calculation
  let currentStreak = 0;
  let checkDate: string;

  const todayLogged = dateSet.has(todayYMD);

  if (todayLogged) {
    // If the user logged the habit today, streak is ALWAYS at least 1
    currentStreak = 1;
    checkDate = addDaysYMD(todayYMD, -1);
  } else {
    // Find the most recent scheduled day strictly before today (yesterday or earlier)
    let lastSched: string | null = null;
    let step = addDaysYMD(todayYMD, -1);
    for (let i = 0; i < 14; i++) {
      if (isHabitScheduledOn(habit, step)) {
        lastSched = step;
        break;
      }
      step = addDaysYMD(step, -1);
    }

    if (lastSched && dateSet.has(lastSched)) {
      // The last scheduled day was logged! Streak is still alive ending on that day.
      currentStreak = 1;
      checkDate = addDaysYMD(lastSched, -1);
    } else {
      // Last scheduled day was missed -> streak broke
      currentStreak = 0;
      checkDate = '';
    }
  }

  if (currentStreak > 0 && checkDate) {
    const minDate = sortedDates[0];
    while (checkDate >= minDate) {
      if (dateSet.has(checkDate)) {
        // Logged on this day (scheduled or bonus day)
        currentStreak += 1;
      } else if (isHabitScheduledOn(habit, checkDate)) {
        // Scheduled day was missed -> streak broke
        break;
      }
      // Unscheduled rest day and not logged -> skip without breaking
      checkDate = addDaysYMD(checkDate, -1);
    }
  }

  // 2. Best streak calculation (longest consecutive run in history)
  let bestStreak = 0;
  let tempRun = 0;
  let prevDate: string | null = null;

  for (const d of sortedDates) {
    if (!prevDate) {
      tempRun = 1;
    } else {
      let missedBetween = false;
      let s = addDaysYMD(prevDate, 1);
      while (s < d) {
        if (isHabitScheduledOn(habit, s) && !dateSet.has(s)) {
          missedBetween = true;
          break;
        }
        s = addDaysYMD(s, 1);
      }
      if (missedBetween) {
        tempRun = 1;
      } else {
        tempRun += 1;
      }
    }
    prevDate = d;
    if (tempRun > bestStreak) {
      bestStreak = tempRun;
    }
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  return { currentStreak, bestStreak };
}
