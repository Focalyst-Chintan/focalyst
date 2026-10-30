import type { Guide, Platform } from '@/content/guides';

export const SITE = 'https://focalyst.online';
export const SUPPORT_EMAIL = 'contactfocalyst@gmail.com';

// Strip the **bold** and [[Key]] markers for plain-text uses (JSON-LD, search).
export function plainText(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1');
}

export function hasSteps(p: Platform): boolean {
  return !p.unavailable && (p.methods ?? []).some((m) => m.steps.length > 0);
}

export type Availability = { web: boolean; phone: boolean; pro: boolean };

export function availability(g: Guide): Availability {
  return { web: hasSteps(g.web), phone: hasSteps(g.phone), pro: g.pro === 'only' };
}

function platformWords(p: Platform): string {
  return [
    ...(p.methods ?? []).flatMap((m) => [m.label ?? '', ...m.steps]),
    ...(p.notes ?? []),
    p.unavailable ?? '',
  ].join(' ');
}

export function readMinutes(g: Guide): number {
  const text = [g.answer, platformWords(g.web), platformWords(g.phone), ...(g.goodToKnow ?? [])].join(' ');
  const words = plainText(text).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatUpdated(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Cut at a word boundary so it fits in max characters.
export function cutWords(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > 0 ? cut.slice(0, at) : cut).replace(/[\s,.;:]+$/, '')}…`;
}

export function metaTitle(g: Guide): string {
  const action = g.title.charAt(0).toLowerCase() + g.title.slice(1);
  const base = `How to ${action} in Focalyst`;
  const full = `${base} · Web and phone guide`;
  if (full.length <= 60) return full;
  if (base.length <= 60) return base;
  return cutWords(base, 60);
}

export function metaDescription(g: Guide): string {
  return cutWords(g.answer, 155);
}
