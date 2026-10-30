import React from 'react';
import {
  CalendarPlus,
  ChartColumn,
  CircleHelp,
  GripVertical,
  Hourglass,
  Languages,
  LayoutGrid,
  ListChecks,
  Mic,
  Moon,
  NotebookPen,
  Plug,
  Repeat,
  ShieldCheck,
  Sparkles,
  Timer,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  CalendarPlus,
  ChartColumn,
  GripVertical,
  Hourglass,
  Languages,
  LayoutGrid,
  ListChecks,
  Mic,
  Moon,
  NotebookPen,
  Plug,
  Repeat,
  ShieldCheck,
  Sparkles,
  Timer,
};

// Icon tile tinted with the guide colour. Light: colour at 10%, icon in a dark
// shade. Dark: colour at 14% with a 1 px border at 40%, icon in a light tint.
// Mixing with --ink gives the dark shade in light mode and the light tint in
// dark mode from the same rule.
export function GuideIconTile({ icon, color, size = 40 }: { icon: string; color: string; size?: number }) {
  const Icon = ICONS[icon] ?? CircleHelp;
  return (
    <span
      aria-hidden
      style={{ ['--g' as string]: color, width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center rounded-[12px] border border-transparent bg-[color-mix(in_srgb,var(--g)_10%,transparent)] text-[color-mix(in_srgb,var(--g)_62%,var(--ink))] dark:border-[color-mix(in_srgb,var(--g)_40%,transparent)] dark:bg-[color-mix(in_srgb,var(--g)_14%,transparent)]"
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.9} />
    </span>
  );
}

export default GuideIconTile;
