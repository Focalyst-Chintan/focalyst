export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYMDToLocalNoon(ymd: string): Date {
  const clean = String(ymd || '').slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDaysYMD(startYMD: string, daysToAdd: number): string {
  const d = parseYMDToLocalNoon(startYMD);
  d.setDate(d.getDate() + daysToAdd);
  return localDateStr(d);
}
