'use client';
// Chapter 4 · Your setup: screens 15 to 20 (WEB_ONBOARDING_DESIGN.md 4). Screen 21 never appears on the web.
import { useEffect, useId, useRef, useState } from 'react';
import { Info, KeyRound, User, UserPlus } from 'lucide-react';
import { SegmentedControl } from '@/components/desktop/ui';
import { firstName, type OnboardingGroup, type OnboardingHabit } from '@/lib/onboarding/draft';
import { SHOW_GROUP_PRIVACY_LINE } from '@/lib/onboarding/flags';
import { focusTimeSuggestions } from '@/lib/onboarding/plan';
import { StepFrame } from './OnboardingStage';
import { ChoiceWithFollowUp, DateField, MultiCards, SingleChoice, TextField, TimeField, type ChoiceOption } from './patterns';
import { MiniLeaderboard } from './groupVisuals';
import { frameProps, useAdvanceAfterPick, useStepKeys, type ScreenCtx } from './stepKit';
import {
  CUSTOM_HABIT_ICON, GOAL_OPTIONS, OTHER_HABIT, countdownNameFor, daysUntil, formatNumber, formatTime,
  habitOptionsFor, taskPlaceholder,
} from './copy';

const OTHER = '__other';
const MAX_HABITS = 2;

// ---------- 15 · Habits ----------

export function Screen15({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const presets = habitOptionsFor(ctx.answers.profile_type);
  const isPreset = (h: OnboardingHabit) => presets.some((p) => p.name === h.name && p.icon === h.icon);
  const saved = ctx.answers.habits ?? [];
  const [sel, setSel] = useState<string[]>(() => saved.map((h) => (isPreset(h) ? h.name : OTHER)));
  const [otherText, setOtherText] = useState(() => saved.find((h) => !isPreset(h))?.name ?? '');

  const habitsFrom = (values: string[], text: string): OnboardingHabit[] =>
    values.flatMap((v) => {
      if (v === OTHER) return text.trim() ? [{ name: text.trim(), icon: CUSTOM_HABIT_ICON }] : [];
      const p = presets.find((o) => o.name === v);
      return p ? [{ name: p.name, icon: p.icon }] : [];
    });

  const save = (values: string[], text: string) => {
    const habits = habitsFrom(values, text);
    ctx.set('habits', habits.length ? habits : undefined);
    const g = ctx.answers.group;
    if (g && habits.length && g.habit_index > habits.length - 1) ctx.set('group', { ...g, habit_index: 0 });
  };

  const onChange = (values: string[]) => { setSel(values); save(values, otherText); };
  const onOther = (text: string) => { setOtherText(text); save(sel, text); };

  const valid = sel.length > 0 && (!sel.includes(OTHER) || otherText.trim().length > 0);
  const options: ChoiceOption<string>[] = [
    ...presets.map((p) => ({ value: p.name, label: `${p.icon} ${p.name}` })),
    { value: OTHER, label: `${OTHER_HABIT.icon} ${OTHER_HABIT.label}` },
  ];

  // Keys 1 to 9 toggle like a click, including the shake at the maximum.
  const groupRef = useRef<HTMLDivElement>(null);
  const primary = { label: 'Continue', disabled: !valid, onClick: () => { if (valid) ctx.goNext(); } };
  const secondary = { label: 'Skip', onClick: () => { ctx.skip('habits'); ctx.goNext(); } };
  useStepKeys(ctx, primary, {
    count: options.length,
    onPick: (i) => groupRef.current?.querySelectorAll<HTMLElement>('[data-ob-option]')[i]?.click(),
  });

  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      title="Pick up to 2 habits to start."
      subtitle="Small and daily works best. You can add more later."
      primary={primary}
      secondary={secondary}
      body={
        <div ref={groupRef}>
          <MultiCards
            options={options}
            value={sel}
            onChange={onChange}
            max={MAX_HABITS}
            labelledBy={titleId}
            followUp={(v) =>
              v === OTHER ? (
                <TextField
                  aria-label="Your habit"
                  placeholder="Your habit"
                  maxLength={60}
                  autoFocus
                  value={otherText}
                  onChange={(e) => onOther(e.target.value)}
                />
              ) : null
            }
          />
        </div>
      }
    />
  );
}

// ---------- 16 · Habit group ----------

/** The existing join form takes a 6-character code, trimmed and upper-cased (HabitGroupLeaderboardSection). */
const CODE_LENGTH = 6;

const GROUP_OPTIONS: ChoiceOption<OnboardingGroup['mode']>[] = [
  { value: 'create', label: 'Start a group', line: "You'll get a code to share.", icon: UserPlus },
  { value: 'join', label: "Join a friend's group", line: 'Use their invite code.', icon: KeyRound },
  { value: 'none', label: 'Just me for now', line: 'You can join a group later from Plan › Habits.', icon: User },
];

export function Screen16({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const habits = ctx.answers.habits ?? [];
  const group = ctx.answers.group;
  const mode = group?.mode;
  const index: 0 | 1 = group?.habit_index === 1 && habits.length > 1 ? 1 : 0;
  const [code, setCode] = useState(group?.code ?? '');
  const clean = code.trim().toUpperCase();
  const advance = useAdvanceAfterPick(ctx.goNext);

  const pick = (m: OnboardingGroup['mode']) => {
    if (m === 'none') {
      ctx.set('group', { mode: 'none', habit_index: 0 });
      advance();
      return;
    }
    ctx.set('group', m === 'join' ? { mode: m, habit_index: index, code: clean } : { mode: m, habit_index: index });
  };
  const setIndex = (i: 0 | 1) => { if (group) ctx.set('group', { ...group, habit_index: i }); };
  const onCode = (v: string) => {
    const next = v.toUpperCase();
    setCode(next);
    if (group?.mode === 'join') ctx.set('group', { ...group, code: next.trim() });
  };

  const valid = mode !== undefined && (mode !== 'join' || clean.length === CODE_LENGTH);
  const primary = { label: 'Continue', disabled: !valid, onClick: () => { if (valid) ctx.goNext(); } };
  useStepKeys(
    ctx,
    primary,
    { count: GROUP_OPTIONS.length, onPick: (i) => pick(GROUP_OPTIONS[i].value) },
    // Esc closes the expanded follow-up.
    mode === 'create' || mode === 'join' ? () => ctx.set('group', undefined) : undefined
  );

  const followUp = (m: OnboardingGroup['mode']) => {
    if (m === 'none') return null;
    return (
      <div className="flex flex-col gap-3 pt-1">
        {habits.length === 2 && (
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-2">Which habit?</p>
            <SegmentedControl
              value={String(index)}
              onChange={(v) => setIndex(v === '1' ? 1 : 0)}
              options={habits.map((h, i) => ({ value: String(i), label: `${h.icon} ${h.name}` }))}
              className="max-w-full"
            />
          </div>
        )}
        {m === 'join' && (
          <TextField
            aria-label="Invite code"
            placeholder="Invite code"
            maxLength={CODE_LENGTH}
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            value={code}
            onChange={(e) => onCode(e.target.value)}
            className="uppercase tracking-[0.12em] tabular-nums"
          />
        )}
        <p className="text-[13px] leading-[18px] text-ink-2">We&apos;ll set this up as soon as your plan is saved.</p>
      </div>
    );
  };

  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      title="Stay consistent together."
      subtitle="Track a habit with up to 4 friends and see each other's streaks."
      primary={primary}
      body={
        <>
          <MiniLeaderboard name={firstName(ctx.answers.name)} emoji={habits[index]?.icon} className="mb-6" />
          <ChoiceWithFollowUp options={GROUP_OPTIONS} value={mode} onPick={pick} followUp={followUp} labelledBy={titleId} />
          {SHOW_GROUP_PRIVACY_LINE && (
            <p className="mt-4 text-[12px] leading-[16px] text-ink-3">
              Group members see your name and this habit&apos;s streak and total days. Nothing else.
            </p>
          )}
        </>
      }
    />
  );
}

// ---------- 17 · Countdown ----------

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function Screen17({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(() => ctx.answers.countdown?.name ?? countdownNameFor(ctx.answers.life_stage));
  const [date, setDate] = useState(() => ctx.answers.countdown?.date ?? '');
  const [maxDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 10);
    return ymd(d);
  });

  const days = date ? daysUntil(date) : null;
  const dateOk = days !== null && days >= 0 && date <= maxDate;
  const valid = name.trim().length > 0 && dateOk;

  // Saved only when both fields hold a usable countdown, so the plan never shows half of one.
  const save = (n: string, d: string) => {
    const dd = d ? daysUntil(d) : null;
    if (n.trim() && dd !== null && dd >= 0 && d <= maxDate) ctx.set('countdown', { name: n.trim(), date: d, icon: '⏳' });
    else if (ctx.answers.countdown) ctx.set('countdown', undefined);
  };

  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const end = el.value.length;
    try { el.setSelectionRange(end, end); } catch { /* ignore */ }
  }, []);

  const primary = { label: 'Continue', disabled: !valid, onClick: () => { if (valid) ctx.goNext(); } };
  const secondary = { label: 'Skip', onClick: () => { ctx.skip('countdown'); ctx.goNext(); } };
  useStepKeys(ctx, primary);

  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      title="Anything you're counting down to?"
      subtitle="An exam, a launch, a trip."
      focusTitle={false}
      inlineFooterOnPhone
      primary={primary}
      secondary={secondary}
      body={
        <div className="flex flex-col gap-3">
          <TextField
            ref={nameRef}
            aria-label="Countdown name"
            placeholder="Countdown name"
            maxLength={60}
            enterKeyHint="next"
            data-ob-enter="self"
            value={name}
            onChange={(e) => { setName(e.target.value); save(e.target.value, date); }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
              e.preventDefault();
              if (valid) ctx.goNext();
              else if (name.trim()) dateRef.current?.focus();
            }}
          />
          <DateField
            ref={dateRef}
            aria-label="Date"
            value={date}
            onChange={(v) => { setDate(v); save(name, v); }}
          />
          {dateOk && days !== null && days > 90 && !ctx.flow.isPro && (
            <p className="flex items-start gap-2 rounded-[12px] bg-primary-soft px-3 py-2.5 text-[13px] leading-[18px] text-primary-text">
              <Info className="mt-px h-4 w-4 shrink-0" aria-hidden />
              Free countdowns can be up to 90 days away. This one will be saved and switched on with Pro.
            </p>
          )}
        </div>
      }
    />
  );
}

// ---------- 18 · Tomorrow ----------

const MAX_TASKS = 3;

export function Screen18({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [values, setValues] = useState<string[]>(() => {
    const t = ctx.answers.tasks ?? [];
    return Array.from({ length: MAX_TASKS }, (_, i) => t[i] ?? '');
  });
  const tasks = values.map((v) => v.trim()).filter(Boolean);
  const valid = tasks.length > 0;

  const change = (i: number, v: string) => {
    const next = values.map((x, k) => (k === i ? v : x));
    setValues(next);
    const t = next.map((x) => x.trim()).filter(Boolean);
    ctx.set('tasks', t.length ? t : undefined);
  };

  useEffect(() => { refs.current[0]?.focus({ preventScroll: true }); }, []);

  const primary = { label: 'Continue', disabled: !valid, onClick: () => { if (valid) ctx.goNext(); } };
  const secondary = { label: 'Skip', onClick: () => { ctx.skip('tasks'); ctx.goNext(); } };
  useStepKeys(ctx, primary);

  // The 2nd and 3rd fields appear once the one before has text.
  const shown = values.filter((_, i) => i === 0 || values[i - 1].trim() || values[i].trim()).length;

  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      title="What's one thing you'll get done tomorrow?"
      subtitle="Add up to 3. We'll put them on your plan."
      focusTitle={false}
      inlineFooterOnPhone
      primary={primary}
      secondary={secondary}
      body={
        <div className="flex flex-col gap-3">
          {values.slice(0, shown).map((v, i) => (
            <TextField
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              {...(i === 0 ? { 'aria-labelledby': titleId } : { 'aria-label': `Task ${i + 1}` })}
              placeholder={i === 0 ? taskPlaceholder(ctx.answers.profile_type) : undefined}
              maxLength={100}
              enterKeyHint={i < MAX_TASKS - 1 ? 'next' : 'done'}
              data-ob-enter="self"
              value={v}
              onChange={(e) => change(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                e.preventDefault();
                // Enter in a filled field moves to the next; in an empty field (or the last) it continues.
                if (v.trim() && i < MAX_TASKS - 1) {
                  // The next field is already shown, since this one has text.
                  refs.current[i + 1]?.focus();
                } else if (valid) {
                  ctx.goNext();
                }
              }}
              className="ob-fade-up"
            />
          ))}
        </div>
      }
    />
  );
}

// ---------- 19 · Daily goal ----------

export function Screen19({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const value = ctx.answers.daily_focus_goal_minutes;
  const advance = useAdvanceAfterPick(ctx.goNext);
  const pick = (v: number) => { ctx.set('daily_focus_goal_minutes', v); advance(); };
  const primary = { label: 'Continue', disabled: value === undefined, onClick: ctx.goNext };
  useStepKeys(ctx, primary, { count: GOAL_OPTIONS.length, onPick: (i) => pick(GOAL_OPTIONS[i].value) });
  const weekly = value !== undefined ? (Math.min(360, value) / 60) * 7 : null;
  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      title="How many hours a day do you want to focus?"
      primary={primary}
      body={
        <>
          <SingleChoice options={GOAL_OPTIONS} value={value} onPick={pick} labelledBy={titleId} />
          <p className="mt-4 min-h-[22px] text-[14px] leading-[22px] text-ink-2" aria-live="polite">
            {weekly !== null ? `That's ${formatNumber(weekly)} hours a week.` : ''}
          </p>
        </>
      }
    />
  );
}

// ---------- 20 · Daily focus time ----------

/**
 * Step A only. The web app has no push or subscription code (no PushManager; public/sw.js has no push handler),
 * only in-tab reminders inside the task and habit forms, so there is no step B and notifications_allowed = false.
 */
export function Screen20({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const suggestions = focusTimeSuggestions(ctx.answers.best_focus_time);
  const [time, setTime] = useState(() => ctx.answers.reminder_time ?? suggestions[0]);
  const primary = {
    label: 'Continue',
    disabled: !time,
    onClick: () => {
      if (!time) return;
      ctx.set('reminder_time', time);
      ctx.set('notifications_allowed', false);
      ctx.set('blocking_set_up', false);
      ctx.goNext();
    },
  };
  const choose = (t: string) => {
    setTime(t);
    ctx.set('reminder_time', t);
  };
  useStepKeys(ctx, primary, { count: suggestions.length, onPick: (i) => choose(suggestions[i]) });
  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      title="When do you want to start focusing each day?"
      subtitle="We'll build your day around it."
      primary={primary}
      body={<TimeField suggestions={suggestions} value={time} onChange={choose} formatLabel={formatTime} labelledBy={titleId} />}
    />
  );
}
