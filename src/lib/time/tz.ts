export const DEFAULT_TZ = 'Asia/Kolkata';

export function safeTz(timezone?: string | null): string {
  const tz = timezone || DEFAULT_TZ;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

export function getTodayRangeInTz(timezone = DEFAULT_TZ) {
  const tz = safeTz(timezone);
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayDateStr = formatter.format(now); // "YYYY-MM-DD"

  // Compute UTC start for midnight in user's timezone
  const invDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const diff = now.getTime() - invDate.getTime();
  const localMidnight = new Date(`${todayDateStr}T00:00:00Z`);
  const startOfDayUtc = new Date(localMidnight.getTime() + diff);

  return { todayDateStr, startOfDayIso: startOfDayUtc.toISOString(), tz };
}
