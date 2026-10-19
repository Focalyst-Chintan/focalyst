import { localDateStr, addDaysYMD } from '@/lib/utils/date';

export type PeriodKind = 'week' | 'month';

export function getPeriod(kind: PeriodKind, offset: number, today = new Date()) {
  let start: Date, end: Date;
  if (kind === 'week') {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset * 7);
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  } else {
    start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  }
  const from = localDateStr(start);
  const to = localDateStr(end);
  const todayYMD = localDateStr(today);
  const effectiveTo = to > todayYMD ? todayYMD : to; // compare only elapsed days
  const span = Math.max(
    0,
    Math.round((new Date(effectiveTo + 'T12:00:00').getTime() - new Date(from + 'T12:00:00').getTime()) / 86400000)
  );
  const prevFrom =
    kind === 'week'
      ? addDaysYMD(from, -7)
      : localDateStr(new Date(start.getFullYear(), start.getMonth() - 1, 1));
  const prevTo = addDaysYMD(prevFrom, span);

  const fmtShort = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const label =
    kind === 'week'
      ? `${start.getDate()} to ${fmtShort(end)}`
      : start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return { from, to, effectiveTo, prevFrom, prevTo, label, start, end };
}
