import { safeTz } from '@/lib/time/tz';

export { safeTz };

const DAY_MS = 86_400_000;

function parts(date: Date, tz: string) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute') };
}

/** YYYY-MM-DD of an instant in the given time zone. */
export function localDate(value: Date | string | null | undefined, tz: string): string | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  const { y, m, d } = parts(date, tz);
  return `${y}-${m}-${d}`;
}

/** HH:MM (24h) of an instant in the given time zone. */
export function localTime(value: Date | string, tz: string): string {
  const { h, min } = parts(typeof value === 'string' ? new Date(value) : value, tz);
  return `${h}:${min}`;
}

/** "YYYY-MM-DD HH:MM" of an instant in the given time zone. */
export function localDateTime(value: string | null | undefined, tz: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${localDate(date, tz)} ${localTime(date, tz)}`;
}

export function todayIn(tz: string): string {
  return localDate(new Date(), tz)!;
}

/** Calendar arithmetic on YYYY-MM-DD strings. */
export function addDays(day: string, n: number): string {
  const t = Date.parse(`${day}T00:00:00Z`) + n * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD string. */
export function weekdayIndex(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

export function weekdayName(day: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
}

/** "27 Nov" style label of an instant in the given time zone. */
export function shortDateLabel(value: string | Date, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: tz }).format(
    typeof value === 'string' ? new Date(value) : value
  );
}

function offsetMs(instant: number, tz: string): number {
  const { y, m, d, h, min } = parts(new Date(instant), tz);
  const asUtc = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
  return asUtc - Math.floor(instant / 60_000) * 60_000;
}

/** UTC ISO instant of local midnight at the start of `day` in `tz` (DST aware). */
export function startOfDayUtc(day: string, tz: string): string {
  const guess = Date.parse(`${day}T00:00:00Z`);
  let t = guess - offsetMs(guess, tz);
  t = guess - offsetMs(t, tz);
  return new Date(t).toISOString();
}

/** Half-open UTC range [start of `from`, start of the day after `to`). */
export function utcRange(from: string, to: string, tz: string) {
  return { gte: startOfDayUtc(from, tz), lt: startOfDayUtc(addDays(to, 1), tz) };
}

export function isRealDate(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const t = Date.parse(`${day}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === day;
}

/** "HH:MM:SS" time column to "HH:MM". */
export function hhmm(value: string | null | undefined): string | null {
  return value ? value.slice(0, 5) : null;
}
