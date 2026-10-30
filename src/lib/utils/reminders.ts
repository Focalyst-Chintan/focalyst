// Reminders are written by the phone app, the web app and Focalyst AI, and the
// three disagree on field names: the date lives in `day` (older web code used
// `date`), and custom repeats use custom_every/custom_unit (phone),
// custom_repeat_every/custom_repeat_frequency (migration) or
// custom_interval/custom_frequency (older web code). Normalise every row so
// both calendar views can read all of them, and drop rows that can't be read
// instead of failing the whole calendar.

const UNITS: Record<string, 'day' | 'week' | 'month' | 'year'> = {
  day: 'day',
  days: 'day',
  daily: 'day',
  week: 'week',
  weeks: 'week',
  weekly: 'week',
  month: 'month',
  months: 'month',
  monthly: 'month',
  year: 'year',
  years: 'year',
  yearly: 'year',
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export type ReminderRow = Record<string, unknown> & {
  title: string;
  day: string;
  date: string;
  repeat: string;
  custom_every: number | null;
  custom_interval: number | null;
  custom_unit: 'day' | 'week' | 'month' | 'year' | null;
  custom_frequency: 'day' | 'week' | 'month' | 'year' | null;
};

export function normalizeReminderRows(rows: unknown): ReminderRow[] {
  if (!Array.isArray(rows)) return [];
  const out: ReminderRow[] = [];
  let skipped = 0;

  for (const raw of rows) {
    try {
      if (!raw || typeof raw !== 'object') throw new Error('not an object');
      const r = raw as Record<string, unknown>;

      const ymd = String(r.day ?? r.date ?? r.reminder_date ?? '').slice(0, 10);
      if (!YMD.test(ymd)) throw new Error('missing date');

      const every = Number(r.custom_every ?? r.custom_repeat_every ?? r.custom_interval);
      const unitRaw = String(r.custom_unit ?? r.custom_repeat_frequency ?? r.custom_frequency ?? '')
        .trim()
        .toLowerCase();
      const unit = UNITS[unitRaw] ?? null;

      out.push({
        ...r,
        title: typeof r.title === 'string' ? r.title : '',
        day: ymd,
        date: ymd,
        repeat: String(r.repeat ?? r.repeat_mode ?? 'Never'),
        custom_every: Number.isFinite(every) && every > 0 ? every : null,
        custom_interval: Number.isFinite(every) && every > 0 ? every : null,
        custom_unit: unit,
        custom_frequency: unit,
      });
    } catch {
      skipped += 1;
    }
  }

  if (skipped > 0 && process.env.NODE_ENV === 'development') {
    console.warn(`[calendar] skipped ${skipped} reminder row(s) that couldn't be read`);
  }
  return out;
}

export function logReminderQueryError(error: { code?: string; message?: string } | null) {
  if (error && process.env.NODE_ENV === 'development') {
    console.error('[calendar] reminders query failed', { code: error.code, message: error.message });
  }
}
