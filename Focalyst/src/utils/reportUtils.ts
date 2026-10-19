import AsyncStorage from '@react-native-async-storage/async-storage';

const dismissedInMemory = new Set<string>();

/**
 * Returns deterministic ISO week key for the current Sunday reporting window (e.g., "2026-W41")
 */
export function getISOWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns the exact UTC start_date (previous Sunday 00:00:00) and end_date (Saturday 23:59:59.999)
 * for the most recently completed week.
 */
export function getCompletedWeekBounds(now: Date = new Date()): {
  startDateISO: string;
  endDateISO: string;
  weekKey: string;
} {
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - dayOfWeek);
  lastSunday.setHours(0, 0, 0, 0);

  const endDate = new Date(
    Date.UTC(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate() - 1, 23, 59, 59, 999)
  );
  const startDate = new Date(
    Date.UTC(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate() - 7, 0, 0, 0, 0)
  );

  return {
    startDateISO: startDate.toISOString(),
    endDateISO: endDate.toISOString(),
    weekKey: getISOWeekKey(lastSunday),
  };
}

/**
 * STRICT SUNDAY-ONLY RULE:
 * Returns true ONLY if today is Sunday (getDay() === 0) in local device time.
 * On Thursday (Oct 15) or any Mon-Sat, this strictly returns false.
 */
export function isReportWindowOpen(now: Date = new Date()): boolean {
  return now.getDay() === 0;
}

export async function isReportDismissedThisWeek(userId: string): Promise<boolean> {
  if (!userId) return true;
  // Never show popup on Monday-Saturday
  if (!isReportWindowOpen()) return true;

  const weekKey = getISOWeekKey(new Date());
  const storageKey = `focalyst_report_dismissed_${userId}_${weekKey}`;

  if (dismissedInMemory.has(storageKey)) {
    return true;
  }

  try {
    const val = await AsyncStorage.getItem(storageKey);
    if (val === 'true') {
      dismissedInMemory.add(storageKey);
      return true;
    }
  } catch {}

  return false;
}

export async function markReportDismissedThisWeek(userId: string, supabase?: any): Promise<void> {
  if (!userId) return;
  const weekKey = getISOWeekKey(new Date());
  const storageKey = `focalyst_report_dismissed_${userId}_${weekKey}`;
  dismissedInMemory.add(storageKey);

  try {
    await AsyncStorage.setItem(storageKey, 'true');
  } catch {}

  if (supabase) {
    try {
      await supabase
        .from('reports')
        .update({ seen_by_user: true })
        .eq('user_id', userId)
        .eq('seen_by_user', false);
    } catch {}
  }
}
