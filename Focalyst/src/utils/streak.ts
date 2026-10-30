/**
 * Canonical Habit Streak Calculation for Focalyst Mobile.
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

export function getDayOfWeekFromYMD(ymd: string): number {
  const clean = String(ymd || '').slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return new Date().getDay();
  }
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0)).getUTCDay();
}

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

export function isHabitScheduledOn(habit: HabitSchedule, ymd: string): boolean {
  if (habit.frequency === 'daily') {
    return true;
  }
  if (habit.frequency === 'custom') {
    const days = habit.custom_days || habit.repeat_days;
    if (!days || !Array.isArray(days) || days.length === 0) {
      return false;
    }
    const dow = getDayOfWeekFromYMD(ymd);
    return days.includes(dow);
  }
  // Any non-daily frequency that isn't based on custom_days is not treated as daily
  return false;
}

export function calculateHabitStreak(
  habit: HabitSchedule,
  completedDates: (string | Date | null | undefined)[],
  todayYMD: string
): HabitStreakResult {
  if (!completedDates || completedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

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

  let currentStreak = 0;
  let checkDate: string;

  const todayIsSched = isHabitScheduledOn(habit, todayYMD);
  const todayLogged = dateSet.has(todayYMD);

  if (todayIsSched && todayLogged) {
    currentStreak = 1;
    checkDate = addDaysYMD(todayYMD, -1);
  } else {
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
      currentStreak = 1;
      checkDate = addDaysYMD(lastSched, -1);
    } else {
      currentStreak = 0;
      checkDate = '';
    }
  }

  if (currentStreak > 0 && checkDate) {
    const minDate = sortedDates[0];
    while (checkDate >= minDate) {
      if (isHabitScheduledOn(habit, checkDate)) {
        if (dateSet.has(checkDate)) {
          currentStreak += 1;
        } else {
          break;
        }
      }
      checkDate = addDaysYMD(checkDate, -1);
    }
  }

  let bestStreak = 0;
  let tempRun = 0;
  let prevSchedDate: string | null = null;

  const schedLogs = sortedDates.filter((d) => isHabitScheduledOn(habit, d));

  for (const d of schedLogs) {
    if (!prevSchedDate) {
      tempRun = 1;
    } else {
      let missedBetween = false;
      let s = addDaysYMD(prevSchedDate, 1);
      while (s < d) {
        if (isHabitScheduledOn(habit, s)) {
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
    prevSchedDate = d;
    if (tempRun > bestStreak) {
      bestStreak = tempRun;
    }
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  return { currentStreak, bestStreak };
}
