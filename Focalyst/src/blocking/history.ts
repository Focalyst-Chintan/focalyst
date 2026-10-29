import type { StrictnessLevel } from '../../modules/screen-time-blocker';

/** One finished blocking session, kept locally (and synced to Supabase when signed in). */
export type BlockingSessionRecord = {
  id: string;
  kind: 'pomodoro' | 'quick' | 'schedule';
  level: StrictnessLevel;
  startedAt: number;
  endedAt: number;
  plannedSets: number;
  completedSets: number;
  focusMinutes: number;
  endedEarly: boolean;
  attemptsCount: number;
  unlocksCount: number;
  emergencyUsed: boolean;
  /** Permission was lost mid-session. */
  interrupted: boolean;
  events: BlockingEventRecord[];
};

export type UnlockReason = 'study' | 'reply' | 'bored' | 'other';

export type BlockingEventRecord = {
  type: 'attempt' | 'unlock' | 'emergency';
  /** App or site name from the shield (iOS gives names only inside the shield extension). */
  appLabel?: string | null;
  /** Android package name, for the real icon. Null on iOS (apps are opaque tokens). */
  appKey?: string | null;
  at: number;
  minuteIntoBlock?: number | null;
  reason?: UnlockReason | null;
  minutes?: number | null;
};

export const REASON_LABELS: Record<UnlockReason, string> = {
  study: 'Studying or work',
  reply: 'Replying to someone',
  bored: 'Just bored',
  other: 'Something else',
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight of the Monday that starts the week containing `t`. */
export function weekStart(t = Date.now()) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

const attemptsOf = (records: BlockingSessionRecord[]) => records.flatMap((r) => r.events.filter((e) => e.type === 'attempt'));
const unlocksOf = (records: BlockingSessionRecord[]) => records.flatMap((r) => r.events.filter((e) => e.type === 'unlock'));

/** Mon..Sun attempt counts for this week, plus last week's total for the comparison footer. */
export function weeklyAttempts(records: BlockingSessionRecord[], now = Date.now()) {
  const start = weekStart(now);
  const days = Array.from({ length: 7 }, () => 0);
  let lastWeek = 0;
  for (const e of attemptsOf(records)) {
    if (e.at >= start && e.at < start + 7 * DAY_MS) days[Math.floor((e.at - start) / DAY_MS)] += 1;
    else if (e.at >= start - 7 * DAY_MS && e.at < start) lastWeek += 1;
  }
  const todayIndex = Math.floor((now - start) / DAY_MS);
  const hasLastWeek = records.some((r) => r.endedAt >= start - 7 * DAY_MS && r.endedAt < start);
  return { days, todayIndex, thisWeek: days.reduce((a, b) => a + b, 0), lastWeek, hasLastWeek };
}

/** Attempts per day for the last `n` days (oldest first). */
export function dailyAttempts(records: BlockingSessionRecord[], n: number, now = Date.now()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const first = today.getTime() - (n - 1) * DAY_MS;
  const days = Array.from({ length: n }, (_, i) => ({ at: first + i * DAY_MS, count: 0 }));
  for (const e of attemptsOf(records)) {
    const i = Math.floor((e.at - first) / DAY_MS);
    if (i >= 0 && i < n) days[i].count += 1;
  }
  return days;
}

export function topApps(records: BlockingSessionRecord[], limit = 5) {
  const counts = new Map<string, { count: number; appKey: string | null }>();
  for (const e of attemptsOf(records)) {
    if (!e.appLabel) continue;
    const entry = counts.get(e.appLabel) ?? { count: 0, appKey: null };
    entry.count += 1;
    entry.appKey ??= e.appKey ?? null;
    counts.set(e.appLabel, entry);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([app, { count, appKey }]) => ({ app, count, appKey }));
}

export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

const timeOfDay = (t: number): TimeOfDay => {
  const h = new Date(t).getHours();
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 22) return 'Evening';
  return 'Night';
};

export function attemptsByTimeOfDay(records: BlockingSessionRecord[]) {
  const buckets: Record<TimeOfDay, number> = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
  for (const e of attemptsOf(records)) buckets[timeOfDay(e.at)] += 1;
  return buckets;
}

export function unlockReasons(records: BlockingSessionRecord[]) {
  const counts: Record<UnlockReason, number> = { study: 0, reply: 0, bored: 0, other: 0 };
  for (const e of unlocksOf(records)) if (e.reason) counts[e.reason] += 1;
  return counts;
}

/** Average minutes into a focus block before the first attempt, over sessions that had one. */
export function avgMinutesToFirstAttempt(records: BlockingSessionRecord[]) {
  const firsts = records
    .map((r) => r.events.find((e) => e.type === 'attempt' && e.minuteIntoBlock != null)?.minuteIntoBlock)
    .filter((m): m is number => m != null);
  if (!firsts.length) return null;
  return Math.round(firsts.reduce((a, b) => a + b, 0) / firsts.length);
}

/** "Unlock reasons: Replying to someone (1)" for one session, or null. */
export function unlockReasonsLine(record: BlockingSessionRecord) {
  const counts = unlockReasons([record]);
  const parts = (Object.keys(counts) as UnlockReason[])
    .filter((k) => counts[k] > 0)
    .map((k) => `${REASON_LABELS[k]} (${counts[k]})`);
  return parts.length ? `Unlock reasons: ${parts.join(', ')}` : null;
}

/** FOCALYST_BLOCKING_FLOW.md 5.4: one insight, in priority order, after 3+ completed sessions. */
export function patternInsight(records: BlockingSessionRecord[]): string | null {
  const completed = records.filter((r) => !r.endedEarly);
  if (completed.length < 3) return null;

  const attempts = attemptsOf(records);
  if (attempts.length > 0) {
    const early = attempts.filter((e) => e.minuteIntoBlock != null && e.minuteIntoBlock < 10).length;
    if (early / attempts.length > 0.5) {
      return 'Most attempts happen in the first 10 minutes. Try starting with a 2-minute warm-up task.';
    }
  }

  const unlocks = unlocksOf(records).filter((e) => e.reason);
  if (unlocks.length > 0 && unlocks.filter((e) => e.reason === 'bored').length / unlocks.length > 0.5) {
    return 'Most unlocks were boredom. A quick stretch on your break might help more.';
  }

  const top = topApps(records, 1)[0];
  if (top && attempts.length > 0 && top.count / attempts.length > 0.6) {
    return `${top.app} makes up most of your attempts. Consider keeping it locked during breaks too.`;
  }

  // Three decreases in a row need four sessions.
  const last = records.slice(-4).map((r) => r.attemptsCount);
  if (last.length === 4 && last[0] > last[1] && last[1] > last[2] && last[2] > last[3]) {
    return "Fewer attempts three sessions in a row. It's getting easier.";
  }
  return null;
}

/** Compact stats for Ask Focalyst AI. Exact counts only. */
export function aiBlockingSummary(records: BlockingSessionRecord[], now = Date.now()) {
  const weekAgo = now - 7 * DAY_MS;
  const thisWeek = records.filter((r) => r.endedAt >= weekAgo);
  const reasons = unlockReasons(thisWeek);
  const topReason = (Object.keys(reasons) as UnlockReason[]).sort((a, b) => reasons[b] - reasons[a])[0];
  const buckets = attemptsByTimeOfDay(thisWeek);
  const peak = (Object.keys(buckets) as TimeOfDay[]).sort((a, b) => buckets[b] - buckets[a])[0];
  const lastWeek = records.filter((r) => r.endedAt >= weekAgo - 7 * DAY_MS && r.endedAt < weekAgo);
  return {
    total_blocked_sessions: records.length,
    blocked_sessions_last_7_days: thisWeek.length,
    attempts_last_7_days: attemptsOf(thisWeek).length,
    attempts_previous_7_days: lastWeek.length ? attemptsOf(lastWeek).length : null,
    unlocks_used_last_7_days: unlocksOf(thisWeek).length,
    emergency_unlocks_last_7_days: thisWeek.filter((r) => r.emergencyUsed).length,
    most_tempting_app: topApps(thisWeek, 1)[0]?.app ?? null,
    top_unlock_reason: reasons[topReason] > 0 ? REASON_LABELS[topReason] : null,
    peak_distraction_time_of_day: buckets[peak] > 0 ? peak : null,
    avg_minutes_before_first_attempt: avgMinutesToFirstAttempt(thisWeek),
  };
}
