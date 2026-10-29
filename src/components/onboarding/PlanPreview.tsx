'use client';
// The live plan card (WEB_ONBOARDING_DESIGN.md 3.4). Shows only what the user answered.
import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BellRing, CircleAlert, Flag, Hourglass, ListChecks, Repeat, Smartphone, Target, Timer, UserRound, Users,
} from 'lucide-react';
import { firstName, type AnswerKey, type OnboardingAnswers } from '@/lib/onboarding/draft';
import { rhythmFor } from '@/lib/onboarding/plan';
import { ROLE_LABELS, LIFE_STAGE_SHORT, formatTime, daysUntil, hoursText } from './copy';

type Variant = 'panel' | 'card';

interface RowData {
  key: string;
  label: string;
  icon: LucideIcon;
  value: string | null;
  extra?: ReactNode;
  skipped?: boolean;
  hidden?: boolean;
}

function ProChip({ variant }: { variant: Variant }) {
  return (
    <span
      className={`ml-1.5 inline-flex h-[18px] items-center rounded-full px-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] align-middle ${
        variant === 'panel' ? 'bg-snow/15 text-snow' : 'bg-primary-soft text-primary-text'
      }`}
    >
      Pro
    </span>
  );
}

function buildRows(a: OnboardingAnswers, skipped: AnswerKey[], isPro: boolean, variant: Variant): RowData[] {
  const sk = (k: AnswerKey) => skipped.includes(k);
  const noHabits = sk('habits') || (a.habits !== undefined && a.habits.length === 0);

  const distractions = a.distractions?.length
    ? a.distractions.slice(0, 2).join(', ') + (a.distractions.length > 2 ? ` +${a.distractions.length - 2}` : '')
    : null;

  const rhythm = a.focus_drift_minutes ? rhythmFor(a.focus_drift_minutes, isPro) : null;

  const days = a.countdown ? daysUntil(a.countdown.date) : null;

  const groupText = a.group
    ? a.group.mode === 'create' ? 'Starting a group' : a.group.mode === 'join' ? 'Joining with a code' : 'Just me'
    : null;

  const goal = a.daily_focus_goal_minutes
    ? a.daily_focus_goal_minutes >= 360
      ? '6+ hours'
      : `${a.daily_focus_goal_minutes / 60} ${a.daily_focus_goal_minutes === 60 ? 'hour' : 'hours'}`
    : null;

  return [
    { key: 'role', label: 'Role', icon: UserRound, value: a.profile_type ? ROLE_LABELS[a.profile_type] : null },
    {
      key: 'towards', label: 'Working towards', icon: Flag,
      value: a.life_stage ? LIFE_STAGE_SHORT[a.life_stage] : null,
      skipped: sk('life_stage'),
      hidden: a.profile_type !== undefined && a.profile_type !== 'student',
    },
    { key: 'way', label: 'What gets in the way', icon: CircleAlert, value: distractions, skipped: sk('distractions') },
    {
      key: 'phone', label: 'Phone time', icon: Smartphone,
      value: a.daily_phone_hours !== undefined ? `${hoursText(a.daily_phone_hours)} h a day` : null,
    },
    {
      key: 'rhythm', label: 'Focus rhythm', icon: Timer, value: rhythm?.label ?? null,
      extra: rhythm?.proIdeal ? (
        <span className={`mt-0.5 block text-[12px] ${variant === 'panel' ? 'text-snow/70' : 'text-ink-2'}`}>
          {rhythm.proIdeal} with<ProChip variant={variant} />
        </span>
      ) : undefined,
    },
    {
      key: 'habits', label: 'Habits', icon: Repeat,
      value: a.habits?.length ? a.habits.map((h) => `${h.icon} ${h.name}`).join(', ') : null,
      skipped: noHabits,
    },
    { key: 'group', label: 'Habit group', icon: Users, value: noHabits ? null : groupText, skipped: noHabits || sk('group') },
    {
      key: 'countdown', label: 'Countdown', icon: Hourglass,
      value: a.countdown && days !== null ? `${a.countdown.name} · ${days} ${days === 1 ? 'day' : 'days'}` : null,
      extra: days !== null && days > 90 && !isPro ? <ProChip variant={variant} /> : undefined,
      skipped: sk('countdown'),
    },
    {
      key: 'tasks', label: 'Tomorrow', icon: ListChecks,
      value: a.tasks?.length ? `${a.tasks.length} ${a.tasks.length === 1 ? 'task' : 'tasks'}` : null,
      skipped: sk('tasks'),
    },
    { key: 'goal', label: 'Daily goal', icon: Target, value: goal },
    { key: 'time', label: 'Daily focus time', icon: BellRing, value: a.reminder_time ? formatTime(a.reminder_time) : null },
  ];
}

function Row({ row, variant, delayMs }: { row: RowData; variant: Variant; delayMs: number | null }) {
  // Animate only when the value changes after mount, never on the first render (resume).
  const [initial] = useState(row.value);
  const changed = row.value !== null && row.value !== initial;
  const panel = variant === 'panel';

  return (
    <li
      className={`flex items-center gap-3 ${delayMs !== null ? 'ob-stagger' : ''}`}
      style={delayMs !== null ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <span
        key={changed ? `t-${row.value}` : 't'}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${
          panel ? 'bg-snow/10 text-snow' : 'bg-primary-soft text-primary-text'
        } ${changed && panel ? 'ob-tile-pulse' : ''}`}
      >
        <row.icon className="h-4 w-4" aria-hidden />
      </span>
      <span className={`shrink-0 text-[13px] leading-[18px] ${panel ? 'text-snow/60' : 'text-ink-2'}`}>{row.label}</span>
      <span className="ml-auto min-w-0 flex-1 text-right">
        {row.value !== null ? (
          <span key={changed ? `v-${row.value}` : 'v'} className={`block ${changed ? 'ob-fade-up' : ''}`}>
            <span className={`text-[14px] font-medium leading-[20px] break-words ${panel ? 'text-snow' : 'text-ink'}`}>{row.value}</span>
            {row.extra}
          </span>
        ) : row.skipped ? (
          <span className={`text-[14px] ${panel ? 'text-snow/40' : 'text-ink-3'}`}>Skipped</span>
        ) : (
          <span
            aria-label="Not answered yet"
            className={`ml-auto block w-20 border-t border-dashed ${panel ? 'border-snow/20' : 'border-line-strong'}`}
          />
        )}
      </span>
    </li>
  );
}

export function PlanPreview({
  answers, skipped = [], isPro = false, variant = 'panel', onlyFilled = false, className = '',
}: {
  answers: OnboardingAnswers;
  skipped?: AnswerKey[];
  isPro?: boolean;
  variant?: Variant;
  /** Screen 25: show only filled rows, fading up in sequence. */
  onlyFilled?: boolean;
  className?: string;
}) {
  const name = firstName(answers.name);
  const rows = buildRows(answers, skipped, isPro, variant).filter((r) => !r.hidden && (!onlyFilled || r.value !== null));
  const panel = variant === 'panel';

  return (
    <section
      aria-label="Your plan so far"
      className={`w-full rounded-[20px] p-6 ${panel ? 'max-w-[400px] border border-snow/15 bg-snow/10' : 'frost max-w-[520px]'} ${className}`}
    >
      <h2 className={`font-display text-[36px] leading-[40px] ${panel ? 'text-snow' : 'text-ink'}`}>
        {name ? `${name}'s plan` : 'Your plan'}
      </h2>
      <ul className="mt-5 flex flex-col gap-3">
        {rows.map((r, i) => (
          <Row key={r.key} row={r} variant={variant} delayMs={onlyFilled ? i * 40 : null} />
        ))}
      </ul>
    </section>
  );
}

export default PlanPreview;
