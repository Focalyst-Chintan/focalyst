'use client';
// Screens 2 and 3: a cloud of glowing feature pills (change register: feature pill cloud).
// These colours are a deliberate exception to the brand-blue-only rule, for this cloud only.
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChartColumn, Hourglass, LayoutGrid, ListChecks, Mic, NotebookPen, Plug, Repeat, ShieldCheck, Sparkles, Timer, Users,
} from 'lucide-react';

/**
 * colour, plus its light tint (text in dark mode) and dark shade (text in light mode).
 * Checked at 4.5:1 or more against the pill background: colour at 14% over #05070F and #03195B (dark),
 * colour at 10% over #F4F6FB and #FFFFFF (light). The lowest is 6.3:1.
 */
const PILLS: { label: string; icon: LucideIcon; color: string; light: string; dark: string }[] = [
  { label: 'Tasks', icon: ListChecks, color: '#3781FC', light: '#BFDBFE', dark: '#1E40AF' },
  { label: 'Habits', icon: Repeat, color: '#34D399', light: '#A7F3D0', dark: '#065F46' },
  { label: 'Focus timer', icon: Timer, color: '#22D3EE', light: '#A5F3FC', dark: '#155E75' },
  { label: 'Notes', icon: NotebookPen, color: '#FBBF24', light: '#FDE68A', dark: '#92400E' },
  { label: 'Voice notes', icon: Mic, color: '#F472B6', light: '#FBCFE8', dark: '#9D174D' },
  { label: 'Countdowns', icon: Hourglass, color: '#FB923C', light: '#FED7AA', dark: '#9A3412' },
  { label: 'Habit groups', icon: Users, color: '#A78BFA', light: '#DDD6FE', dark: '#5B21B6' },
  { label: 'Insights', icon: ChartColumn, color: '#60A5FA', light: '#DBEAFE', dark: '#1E3A8A' },
  { label: 'Focalyst AI', icon: Sparkles, color: '#818CF8', light: '#C7D2FE', dark: '#3730A3' },
  { label: 'Widgets', icon: LayoutGrid, color: '#2DD4BF', light: '#99F6E4', dark: '#115E59' },
  { label: 'App blocking', icon: ShieldCheck, color: '#F87171', light: '#FECACA', dark: '#991B1B' },
  { label: 'Claude and ChatGPT', icon: Plug, color: '#CBD5E1', light: '#E2E8F0', dark: '#334155' },
];

/** On narrow phones only the first 9 pills show. */
const NARROW_COUNT = 9;

export function FeaturePills({
  onDark = false, still = false, phone = false, className = '',
}: {
  /** The desktop plan panel is dark in both themes, so it always uses the dark pill style. */
  onDark?: boolean;
  /** No float (screen 3). */
  still?: boolean;
  /** Phone above the title: at most 4 rows, the first 9 pills on narrow phones. */
  phone?: boolean;
  className?: string;
}) {
  return (
    <ul
      role="list"
      aria-label="Focalyst features"
      className={`ob-pills flex flex-wrap justify-center gap-2.5 ${onDark ? 'ob-pills-dark' : ''} ${phone ? 'ob-pills-phone' : ''} ${className}`}
    >
      {PILLS.map((p, i) => (
        <li
          key={p.label}
          className={`ob-pill-in ${phone && i >= NARROW_COUNT ? 'max-[379px]:hidden' : ''}`}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <span
            className={`ob-pill inline-flex h-9 items-center gap-2 rounded-full pl-1.5 pr-4 text-[14px] font-medium lg:h-10 lg:text-[15px] ${still ? '' : 'ob-pill-float'}`}
            style={{ '--pill': p.color, '--pill-light': p.light, '--pill-dark': p.dark, animationDelay: `${-(i * 0.5)}s` } as CSSProperties}
          >
            <span className="ob-pill-dot flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full">
              <p.icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            {p.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default FeaturePills;
