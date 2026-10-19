export function minuteTicks(maxMin: number): number[] {
  const steps = [15, 30, 60, 120, 180, 240];
  const step = steps.find((s) => maxMin / s <= 4) ?? 360;
  const top = Math.max(step, Math.ceil(maxMin / step) * step);
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}

export const fmtMin = (m: number): string =>
  m < 60 ? `${m}m` : m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`;
