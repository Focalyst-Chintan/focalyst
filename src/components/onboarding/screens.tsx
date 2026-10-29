'use client';
// Screens 1 to 14 (WEB_ONBOARDING_DESIGN.md 4). 15 to 20 live in screensSetup, 22 to 26 in screensReport.
import { useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import type { AnswerKey, OnboardingAnswers } from '@/lib/onboarding/draft';
import { firstName } from '@/lib/onboarding/draft';
import { StepFrame } from './OnboardingStage';
import { Chips, PhoneHoursSlider, SingleChoice, TextField, type ChoiceOption } from './patterns';
import { frameProps, useAdvanceAfterPick, useStepKeys, type ScreenCtx } from './stepKit';
import { Screen15, Screen16, Screen17, Screen18, Screen19, Screen20 } from './screensSetup';
import { Screen22, Screen23, Screen24, Screen25, Screen26 } from './screensReport';
import { AppPreview, BenefitCards, Collage, GatheredChips } from './visuals';
import {
  APPS, BEST_TIME_OPTIONS, DISTRACTIONS, DRIFT_OPTIONS, LIFE_STAGE_OPTIONS, ROLE_OPTIONS, SOURCE_OPTIONS,
  gotItLine, studyWord,
} from './copy';

export type { ScreenCtx } from './stepKit';

// ---------- Chapter 1 · Welcome ----------

function Screen1({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const primary = { label: 'Get started', onClick: ctx.goNext };
  useStepKeys(ctx, primary);
  return (
    <>
      <div className="relative h-[55dvh] overflow-hidden px-2.5 pt-2.5 lg:hidden" aria-hidden>
        <Collage columns={3} images={ctx.collageImages} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_bottom,transparent,var(--canvas))]" />
      </div>
      <StepFrame
        {...frameProps(ctx)}
        titleId={titleId}
        statement
        title="Own your time."
        subtitle="Productivity and mindful living."
        primary={primary}
        body={
          <div className="flex flex-col items-center gap-6 lg:items-start">
            <Link
              href="/login"
              className="text-[14px] font-medium text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] rounded-[6px]"
            >
              I already have an account
            </Link>
            <p className="text-[12px] text-ink-3">
              <Link href="/terms" className="hover:text-ink-2">Terms</Link>
              <span aria-hidden> · </span>
              <Link href="/privacy" className="hover:text-ink-2">Privacy</Link>
            </p>
          </div>
        }
        eyebrow={<PhoneWordmark />}
      />
    </>
  );
}

function PhoneWordmark() {
  return <p className="mb-4 text-center text-[13px] font-semibold tracking-[0.32em] text-ink lg:hidden">FOCALYST</p>;
}

function Screen2({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const primary = { label: 'Continue', onClick: ctx.goNext };
  useStepKeys(ctx, primary);
  return (
    <>
      <div className="px-8 pb-2 pt-8 lg:hidden">
        <AppPreview className="mx-auto max-w-[400px]" />
      </div>
      <StepFrame
        {...frameProps(ctx)}
        titleId={titleId}
        statement
        title="One calm place for your day."
        subtitle="Tasks, habits, focus and notes, together and in sync with your phone."
        primary={primary}
      />
    </>
  );
}

function Screen3({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const primary = { label: 'Continue', onClick: ctx.goNext };
  useStepKeys(ctx, primary);
  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      statement
      title="Focalyst helps you…"
      primary={primary}
      body={<BenefitCards />}
    />
  );
}

// ---------- Chapter 2 · About you ----------

function Screen4({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const primary = { label: "Let's go", onClick: ctx.goNext };
  useStepKeys(ctx, primary);
  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      statement
      title="Let's build your plan."
      subtitle="A few quick questions. About 2 minutes."
      desktopExtra={<p className="mt-2 text-[13px] text-ink-3">Your plan fills in on the left as you answer.</p>}
      primary={primary}
    />
  );
}

function Screen5({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const value = ctx.answers.name ?? '';
  const valid = value.trim().length > 0;
  const primary = {
    label: 'Continue',
    disabled: !valid,
    onClick: () => {
      if (!valid) return;
      ctx.set('name', value.trim());
      ctx.goNext();
    },
  };
  useStepKeys(ctx, primary);
  useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, []);
  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      title="What should we call you?"
      focusTitle={false}
      inlineFooterOnPhone
      primary={primary}
      body={
        <TextField
          ref={inputRef}
          aria-labelledby={titleId}
          placeholder="Your first name"
          maxLength={40}
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="next"
          value={value}
          onChange={(e) => ctx.set('name', e.target.value)}
        />
      }
    />
  );
}

/** A single-choice screen that saves on pick and advances after 250 ms. */
function ChoiceScreen<K extends AnswerKey, T extends string | number>({
  ctx, field, title, subtitle, options, skippable = false,
}: {
  ctx: ScreenCtx;
  field: K;
  title: string;
  subtitle?: string;
  options: ChoiceOption<T>[];
  skippable?: boolean;
}) {
  const titleId = useId();
  const value = ctx.answers[field] as T | undefined;
  const advance = useAdvanceAfterPick(ctx.goNext);
  const pick = (v: T) => {
    ctx.set(field, v as unknown as OnboardingAnswers[K]);
    advance();
  };
  const primary = { label: 'Continue', disabled: value === undefined, onClick: ctx.goNext };
  const secondary = skippable ? { label: 'Skip', onClick: () => { ctx.skip(field); ctx.goNext(); } } : null;
  useStepKeys(ctx, primary, { count: options.length, onPick: (i) => pick(options[i].value) });
  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      title={title}
      subtitle={subtitle}
      primary={primary}
      secondary={secondary}
      body={<SingleChoice options={options} value={value} onPick={pick} labelledBy={titleId} />}
    />
  );
}

// ---------- Chapter 3 · Your focus right now ----------

function ChipsScreen({
  ctx, field, title, subtitle, options, none,
}: {
  ctx: ScreenCtx;
  field: 'distractions' | 'distracting_apps';
  title: string;
  subtitle: string;
  options: string[];
  none?: string;
}) {
  const titleId = useId();
  const value = ctx.answers[field] ?? [];
  const toggle = (o: string) => ctx.set(field, value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const primary = { label: 'Continue', disabled: value.length === 0, onClick: ctx.goNext };
  const secondary = none ? { label: none, onClick: () => { ctx.set(field, []); ctx.goNext(); } } : null;
  useStepKeys(ctx, primary, { count: Math.min(9, options.length), onPick: (i) => toggle(options[i]) });
  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      title={title}
      subtitle={subtitle}
      primary={primary}
      secondary={secondary}
      body={<Chips options={options} value={value} onToggle={toggle} labelledBy={titleId} />}
    />
  );
}

function Screen11({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const value = ctx.answers.daily_phone_hours;
  const primary = { label: 'Continue', disabled: value === undefined, onClick: ctx.goNext };
  useStepKeys(ctx, primary);
  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      title="About how long are you on your phone each day?"
      primary={primary}
      body={
        <>
          <PhoneHoursSlider value={value} onChange={(v) => ctx.set('daily_phone_hours', v)} labelledBy={titleId} />
          <p className="mt-6 text-[13px] leading-[18px] text-ink-3">
            Not sure? Your phone&apos;s Screen Time or Digital Wellbeing settings show it.
          </p>
        </>
      }
    />
  );
}

function Screen12({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const primary = { label: 'Continue', onClick: ctx.goNext };
  useStepKeys(ctx, primary);
  const name = firstName(ctx.answers.name);
  const d = ctx.answers.distractions ?? [];
  const apps = ctx.answers.distracting_apps ?? [];
  return (
    <StepFrame
      {...frameProps(ctx)}
      titleId={titleId}
      statement
      title={name ? `Got it, ${name}.` : 'Got it.'}
      subtitle={gotItLine(d, apps)}
      primary={primary}
      body={<GatheredChips items={[...d, ...apps]} />}
    />
  );
}

function PlaceholderScreen({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  useStepKeys(ctx, null);
  return <StepFrame {...frameProps(ctx)} titleId={titleId} title="Coming soon" primary={null} />;
}

export function StepScreen({ ctx }: { ctx: ScreenCtx }) {
  const role = ctx.answers.profile_type;
  switch (ctx.step) {
    case 1: return <Screen1 ctx={ctx} />;
    case 2: return <Screen2 ctx={ctx} />;
    case 3: return <Screen3 ctx={ctx} />;
    case 4: return <Screen4 ctx={ctx} />;
    case 5: return <Screen5 ctx={ctx} />;
    case 6: return <ChoiceScreen ctx={ctx} field="profile_type" title="What best describes you?" options={ROLE_OPTIONS} />;
    case 7: return <ChoiceScreen ctx={ctx} field="life_stage" title="What are you working towards?" options={LIFE_STAGE_OPTIONS} skippable />;
    case 8: return <ChoiceScreen ctx={ctx} field="acquisition_source" title="Where did you hear about Focalyst?" options={SOURCE_OPTIONS} skippable />;
    case 9: return <ChipsScreen ctx={ctx} field="distractions" title="What gets in the way most?" subtitle="Pick all that apply." options={DISTRACTIONS} />;
    case 10: return <ChipsScreen ctx={ctx} field="distracting_apps" title="Which apps pull you away?" subtitle="We'll use this for your report." options={APPS} none="None of these" />;
    case 11: return <Screen11 ctx={ctx} />;
    case 12: return <Screen12 ctx={ctx} />;
    case 13: return <ChoiceScreen ctx={ctx} field="focus_drift_minutes" title="How long can you focus before your mind drifts?" options={DRIFT_OPTIONS} />;
    case 14: return <ChoiceScreen ctx={ctx} field="best_focus_time" title={`When do you ${studyWord(role)} best?`} options={BEST_TIME_OPTIONS} />;
    case 15: return <Screen15 ctx={ctx} />;
    case 16: return <Screen16 ctx={ctx} />;
    case 17: return <Screen17 ctx={ctx} />;
    case 18: return <Screen18 ctx={ctx} />;
    case 19: return <Screen19 ctx={ctx} />;
    case 20: return <Screen20 ctx={ctx} />;
    case 22: return <Screen22 ctx={ctx} />;
    case 23: return <Screen23 ctx={ctx} />;
    case 24: return <Screen24 ctx={ctx} />;
    case 25: return <Screen25 ctx={ctx} />;
    case 26: return <Screen26 ctx={ctx} />;
    default: return <PlaceholderScreen ctx={ctx} />;
  }
}
