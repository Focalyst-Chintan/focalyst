import type { StrictnessLevel } from '../../modules/screen-time-blocker';
import { formatClock } from './levels';

export type Schedule = {
  id: string;
  name: string;
  /** Monday first: [M, T, W, T, F, S, S]. */
  days: boolean[];
  /** Minutes after local midnight. A window with end <= start runs past midnight. */
  startMin: number;
  endMin: number;
  level: StrictnessLevel;
  enabled: boolean;
  /** One-off block on this local date (YYYY-MM-DD); `days` is ignored. */
  onceDate?: string;
};

export type ScheduleOccurrence = {
  schedule: Schedule;
  /** Unique per schedule per start day, so one emergency unlock skips only this run. */
  occurrenceId: string;
  startAt: number;
  endAt: number;
};

export const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** JS getDay() is Sunday first; schedules are Monday first. */
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

const atMinutes = (day: Date, minutes: number) => {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d.getTime();
};

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Runs that cover `now`. Checks today's and yesterday's start so overnight windows count. */
export function activeOccurrences(schedules: Schedule[], now = Date.now()): ScheduleOccurrence[] {
  const result: ScheduleOccurrence[] = [];
  const today = new Date(now);
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);

  for (const schedule of schedules) {
    if (!schedule.enabled || schedule.startMin === schedule.endMin) continue;
    const overnight = schedule.endMin <= schedule.startMin;
    for (const day of overnight ? [yesterday, today] : [today]) {
      if (schedule.onceDate ? schedule.onceDate !== dayKey(day) : !schedule.days[mondayIndex(day)]) continue;
      const startAt = atMinutes(day, schedule.startMin);
      const endAt = overnight ? atMinutes(new Date(startAt + 24 * 60 * 60 * 1000), schedule.endMin) : atMinutes(day, schedule.endMin);
      if (now >= startAt && now < endAt) {
        result.push({ schedule, occurrenceId: `${schedule.id}:${dayKey(day)}`, startAt, endAt });
      }
    }
  }
  return result;
}

/** Monday-first index (0 to 6) to Calendar weekday (1 = Sunday ... 7 = Saturday). */
export const mondayIndexToWeekday = (i: number) => ((i + 1) % 7) + 1;

/** A one-off whose window has fully passed. */
export function isExpiredOneOff(s: Schedule, now = Date.now()) {
  if (!s.onceDate) return false;
  const [y, m, d] = s.onceDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const endDay = s.endMin <= s.startMin ? new Date(y, m - 1, d + 1) : start;
  return atMinutes(endDay, s.endMin) <= now;
}

export function formatDays(days: boolean[]) {
  const on = days.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  if (on.length === 7) return 'Every day';
  if (on.length === 0) return 'Never';
  if (on.length === 5 && on.every((i) => i < 5)) return 'Weekdays';
  if (on.length === 2 && on[0] === 5 && on[1] === 6) return 'Weekends';
  return on.map((i) => DAY_NAMES[i]).join(', ');
}

export const minutesToClock = (minutes: number) => formatClock(atMinutes(new Date(), minutes));

export const formatScheduleLine = (s: Schedule) =>
  `${s.onceDate ? 'Once' : formatDays(s.days)} · ${minutesToClock(s.startMin)} to ${minutesToClock(s.endMin)}`;

/** "2h 0m" between two minute-of-day values (wrapping past midnight). */
export function formatSpan(startMin: number, endMin: number) {
  const span = (endMin - startMin + 24 * 60) % (24 * 60) || 24 * 60;
  return `${Math.floor(span / 60)}h ${span % 60}m`;
}

export const newSchedule = (level: StrictnessLevel = 'firm'): Schedule => ({
  id: `sched_${Date.now()}`,
  name: 'Bedtime',
  days: [true, true, true, true, true, true, true],
  startMin: 23 * 60 + 30,
  endMin: 7 * 60,
  level,
  enabled: true,
});
