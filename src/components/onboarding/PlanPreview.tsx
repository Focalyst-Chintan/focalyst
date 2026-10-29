'use client';
// The live plan card (WEB_ONBOARDING_DESIGN.md 3.4). Shows only what the user answered.
import { Fragment, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BellRing, CircleAlert, Flag, Hourglass, ListChecks, Repeat, Smartphone, Target, Timer, UserRound, Users,
} from 'lucide-react';
import { firstName, type AnswerKey, type OnboardingAnswers } from '@/lib/onboarding/draft';
import { rhythmFor } from '@/lib/onboarding/plan';
import { chapterOf } from '@/lib/onboarding/steps';
import { ROLE_LABELS, LIFE_STAGE_SHORT, formatTime, daysUntil, hoursText } from './copy';

type Variant = 'panel' | 'card';

interface RowData {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Chapter index (steps.ts CHAPTERS) where the row is answered. */
  chapter: number;
  /** What fits on the line, for example "Overthinking +1". */
  value: string | null;
  /** The full value, for the title attribute and the accessible label. */
  full?: string;
  /** Inline after the value (a Pro chip). */
  chip?: boolean;
  /** Small second line, shown only when the card is wide enough; otherwise only the chip. */
  second?: ReactNode;
  skipped?: boolean;
  hidden?: boolean;
}

/** First item plus "+n" for multi-value rows. */
function firstPlus(items: string[]) {
  return items.length > 1 ? `${items[0]} +${items.length - 1}` : items[0];
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

  const habitNames = a.habits?.map((h) => `${h.icon} ${h.name}`) ?? [];

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
    { key: 'role', label: 'Role', icon: UserRound, chapter: 1, value: a.profile_type ? ROLE_LABELS[a.profile_type] : null },
    {
      key: 'towards', label: 'Working towards', icon: Flag, chapter: 1,
      value: a.life_stage ? LIFE_STAGE_SHORT[a.life_stage] : null,
      skipped: sk('life_stage'),
      hidden: a.profile_type !== undefined && a.profile_type !== 'student',
    },
    {
      key: 'way', label: 'What gets in the way', icon: CircleAlert, chapter: 2,
      value: a.distractions?.length ? firstPlus(a.distractions) : null,
      full: a.distractions?.join(', '),
      skipped: sk('distractions'),
    },
    {
      key: 'phone', label: 'Phone time', icon: Smartphone, chapter: 2,
      value: a.daily_phone_hours !== undefined ? `${hoursText(a.daily_phone_hours)} h a day` : null,
    },
    {
      key: 'rhythm', label: 'Focus rhythm', icon: Timer, chapter: 2, value: rhythm?.label ?? null,
      full: rhythm ? (rhythm.proIdeal ? `${rhythm.label}, ${rhythm.proIdeal} with Pro` : rhythm.label) : undefined,
      chip: Boolean(rhythm?.proIdeal),
      second: rhythm?.proIdeal ? (
        <span className={`block truncate text-[12px] leading-[14px] ${variant === 'panel' ? 'text-snow/70' : 'text-ink-2'}`}>
          {rhythm.proIdeal} with<ProChip variant={variant} />
        </span>
      ) : undefined,
    },
    {
      key: 'habits', label: 'Habits', icon: Repeat, chapter: 3,
      value: habitNames.length ? firstPlus(habitNames) : null,
      full: habitNames.join(', '),
      skipped: noHabits,
    },
    { key: 'group', label: 'Habit group', icon: Users, chapter: 3, value: noHabits ? null : groupText, skipped: noHabits || sk('group') },
    {
      key: 'countdown', label: 'Countdown', icon: Hourglass, chapter: 3,
      value: a.countdown && days !== null ? `${a.countdown.name} · ${days} ${days === 1 ? 'day' : 'days'}` : null,
      chip: days !== null && days > 90 && !isPro,
      skipped: sk('countdown'),
    },
    {
      key: 'tasks', label: 'Tomorrow', icon: ListChecks, chapter: 3,
      value: a.tasks?.length ? `${a.tasks.length} ${a.tasks.length === 1 ? 'task' : 'tasks'}` : null,
      skipped: sk('tasks'),
    },
    { key: 'goal', label: 'Daily goal', icon: Target, chapter: 3, value: goal },
    { key: 'time', label: 'Daily focus time', icon: BellRing, chapter: 3, value: a.reminder_time ? formatTime(a.reminder_time) : null },
  ];
}

function Row({ row, variant, delayMs }: { row: RowData; variant: Variant; delayMs: number | null }) {
  // Animate only when the value changes after mount, never on the first render (resume).
  const [initial] = useState(row.value);
  const changed = row.value !== null && row.value !== initial;
  const panel = variant === 'panel';
  const full = row.full ?? row.value ?? '';
  const spoken = row.value !== null ? `${row.label}: ${full}` : row.skipped ? `${row.label}: skipped` : `${row.label}: not answered yet`;

  return (
    <li
      aria-label={spoken}
      className={`flex h-10 items-center gap-3 ${delayMs !== null ? 'ob-stagger' : ''}`}
      style={delayMs !== null ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <span
        key={changed ? `t-${row.value}` : 't'}
        aria-hidden
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${
          panel ? 'bg-snow/10 text-snow' : 'bg-primary-soft text-primary-text'
        } ${changed && panel ? 'ob-tile-pulse' : ''}`}
      >
        <row.icon className="h-4 w-4" />
      </span>
      <span aria-hidden className={`w-[136px] shrink-0 truncate text-[13px] leading-[18px] ${panel ? 'text-snow/60' : 'text-ink-2'}`}>
        {row.label}
      </span>
      <span aria-hidden className="min-w-0 flex-1 text-right">
        {row.value !== null ? (
          <span key={changed ? `v-${row.value}` : 'v'} className={`block min-w-0 ${changed ? 'ob-fade-up' : ''}`} title={full}>
            <span className="flex min-w-0 items-center justify-end">
              <span className={`min-w-0 truncate whitespace-nowrap text-[14px] font-medium leading-[18px] ${panel ? 'text-snow' : 'text-ink'}`}>
                {row.value}
              </span>
              {row.chip && (
                <span className={`shrink-0 ${row.second ? '@[340px]:hidden' : ''}`}><ProChip variant={variant} /></span>
              )}
            </span>
            {row.second && <span className="hidden @[340px]:block">{row.second}</span>}
          </span>
        ) : row.skipped ? (
          <span className={`text-[14px] ${panel ? 'text-snow/40' : 'text-ink-3'}`}>Skipped</span>
        ) : (
          <span className={`ml-auto block w-20 border-t border-dashed ${panel ? 'border-snow/20' : 'border-line-strong'}`} />
        )}
      </span>
    </li>
  );
}

export function PlanPreview({
  answers, skipped = [], isPro = false, variant = 'panel', onlyFilled = false, step, rhythmNote, className = '',
}: {
  answers: OnboardingAnswers;
  skipped?: AnswerKey[];
  isPro?: boolean;
  variant?: Variant;
  /** Screen 25: show only filled rows, fading up in sequence. */
  onlyFilled?: boolean;
  /** Current step: empty rows show only for the current and the next chapter. Omit to show every row. */
  step?: number;
  /** Screen 25: the note under the focus rhythm (7.1). */
  rhythmNote?: string;
  className?: string;
}) {
  const name = firstName(answers.name);
  const current = step !== undefined ? chapterOf(step) : null;
  const rows = buildRows(answers, skipped, isPro, variant).filter((r) => {
    if (r.hidden) return false;
    const answered = r.value !== null || Boolean(r.skipped);
    if (onlyFilled) return r.value !== null;
    if (answered || current === null) return true;
    return r.chapter === current || r.chapter === current + 1;
  });
  const panel = variant === 'panel';
  const title = name ? `${name}'s plan` : 'Your plan';

  return (
    <section
      aria-label="Your plan so far"
      className={`@container w-full rounded-[20px] p-6 ${panel ? 'max-w-[400px] border border-snow/15 bg-snow/10' : 'frost max-w-[520px]'} ${className}`}
    >
      <h2 title={title} className={`truncate font-display text-[32px] leading-[36px] ${panel ? 'text-snow' : 'text-ink'}`}>
        {title}
      </h2>
      <ul className="mt-4 flex flex-col">
        {rows.map((r, i) => (
          <Fragment key={r.key}>
            <Row row={r} variant={variant} delayMs={onlyFilled ? i * 40 : null} />
            {r.key === 'rhythm' && rhythmNote && r.value !== null && (
              <li
                className={`-mt-1 mb-1 pl-10 text-[12px] leading-[16px] ${panel ? 'text-snow/70' : 'text-ink-2'} ${onlyFilled ? 'ob-stagger' : ''}`}
                style={onlyFilled ? { animationDelay: `${i * 40}ms` } : undefined}
              >
                {rhythmNote}
              </li>
            )}
          </Fragment>
        ))}
      </ul>
    </section>
  );
}

export default PlanPreview;
