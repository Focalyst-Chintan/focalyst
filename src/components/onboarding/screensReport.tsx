'use client';
// Chapter 5 · Your report: screens 22 to 26 (WEB_ONBOARDING_DESIGN.md 4, 6 and 7). All wide mode.
import { useEffect, useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/desktop/ui';
import { firstName } from '@/lib/onboarding/draft';
import { buildPlan, saveRecommendedPreset } from '@/lib/onboarding/plan';
import { computeOnboardingReport, heroLine, reportSnapshot, type ReportSnapshot } from '@/lib/onboarding/report';
import { isVisible } from '@/lib/onboarding/steps';
import { StepFrame } from './OnboardingStage';
import { Loader } from './patterns';
import { PlanPreview } from './PlanPreview';
import { frameProps, useStepKeys, type ScreenCtx } from './stepKit';
import { formatNumber, studyWord } from './copy';

const FocusChart = dynamic(() => import('./FocusChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px] w-full rounded-[14px]" />,
});

const WidgetPreview = dynamic(() => import('./WidgetPreview'), {
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-[244px] shrink-0 rounded-[44px]" />,
});

const HERO_MS = 900;
const SUPPORT_MS = 450;

function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** The stored report, or one computed from the answers when the draft has none (an old draft). */
function reportOf(ctx: ScreenCtx): ReportSnapshot {
  return ctx.report ?? reportSnapshot(computeOnboardingReport(ctx.answers), buildPlan(ctx.answers, ctx.flow.isPro).presetLabel);
}

/** True only the first time this screen shows; marks it so back and forward don't replay the count-ups (3.7). */
function useFirstShow(ctx: ScreenCtx) {
  const [first] = useState(() => !ctx.countedUp.includes(ctx.step) && !reducedMotion());
  const { markCountedUp, step } = ctx;
  useEffect(() => { markCountedUp(step); }, [markCountedUp, step]);
  return first;
}

function useCountUp(target: number, ms: number, run: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, run]);
  return run ? v : target;
}

/** A number that counts up once; the final value is in aria-label from the start. */
function CountUp({
  value, ms, run, decimals = 0, className = '',
}: { value: number; ms: number; run: boolean; decimals?: number; className?: string }) {
  const v = useCountUp(value, ms, run);
  const shown = decimals ? Math.round(v * 10 ** decimals) / 10 ** decimals : Math.round(v);
  return (
    <span role="img" aria-label={formatNumber(value, decimals)} className={`tabular-nums ${className}`}>
      {formatNumber(shown, decimals)}
    </span>
  );
}

const hoursWord = (n: number) => (n === 1 ? 'hour' : 'hours');

// ---------- 22 · Building your plan ----------

const LOADER_LINES = ['Reading your answers', 'Setting your focus rhythm', 'Preparing your habits and goals', 'Planning your first week'];

export function Screen22({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const { answers, flow, storeReport } = ctx;

  // The real work behind the loader: the report (6) and the plan (7), computed once per visit and stored in the draft.
  const [work] = useState(() => {
    const plan = buildPlan(answers, flow.isPro);
    return { plan, report: reportSnapshot(computeOnboardingReport(answers), plan.presetLabel) };
  });
  useEffect(() => {
    storeReport(work.report, work.plan);
    saveRecommendedPreset(work.plan);
  }, [storeReport, work]);
  // Done once the draft holds this visit's plan.
  const ready = ctx.plan === work.plan;

  useStepKeys(ctx, null);
  const name = firstName(answers.name);
  return (
    <StepFrame
      {...frameProps(ctx)}
      wide
      titleId={titleId}
      title={name ? `Building your plan, ${name}…` : 'Building your plan…'}
      primary={null}
      body={<Loader lines={LOADER_LINES} ready={ready} onDone={ctx.goNext} />}
    />
  );
}

// ---------- 23 · Where your time goes ----------

export function Screen23({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const r = reportOf(ctx);
  const run = useFirstShow(ctx);
  const primary = { label: 'Continue', onClick: ctx.goNext };
  useStepKeys(ctx, primary);
  const apps = (ctx.answers.distracting_apps ?? []).filter((a) => a !== 'Other');
  const healthyBase = r.H <= 1;

  return (
    <StepFrame
      {...frameProps(ctx)}
      wide
      overlineTitle
      titleId={titleId}
      title="Where your time goes"
      primary={primary}
      body={
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <p className="font-ui text-[64px] font-semibold leading-[68px] tracking-[-0.02em] lg:text-[96px] lg:leading-[96px]">
              <CountUp value={r.yearlyPhoneHours} ms={HERO_MS} run={run} className="ob-gradient-text" />
            </p>
            <h2 className="mt-3 text-[20px] font-semibold leading-[26px] text-ink-2">{heroLine({ healthyBase })}</h2>
          </div>
          <div>
            <p className="font-display text-[28px] leading-[34px] text-ink">
              That&apos;s about <CountUp value={r.wakingDays} ms={SUPPORT_MS} run={run} /> waking days.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="frost rounded-[16px] p-4">
                <p className="text-[28px] font-semibold leading-[32px] tabular-nums text-ink">{formatNumber(r.H)} h</p>
                <p className="mt-1 text-[13px] text-ink-2">a day</p>
              </div>
              <div className="frost rounded-[16px] p-4">
                <p className="text-[28px] font-semibold leading-[32px] text-ink">
                  <CountUp value={r.weeklyHours} ms={SUPPORT_MS} run={run} decimals={1} /> h
                </p>
                <p className="mt-1 text-[13px] text-ink-2">a week</p>
              </div>
            </div>
            {apps.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-ink-2">Mostly on</span>
                {apps.map((a) => (
                  <span key={a} className="inline-flex h-8 items-center rounded-full border border-line bg-surface-2 px-3 text-[13px] font-medium text-ink">
                    {a}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-6 text-[12px] leading-[16px] text-ink-3">
              Estimate from your answers: {formatNumber(r.H)} {hoursWord(r.H)} a day, 365 days, 16 waking hours a day.
            </p>
          </div>
        </div>
      }
    />
  );
}

// ---------- 24 · What's possible ----------

/** A hope number: gradient at 44 px, so the 3.7 exception stays at 40 px or larger. */
function HopeNumber({ value, run }: { value: number; run: boolean }) {
  return (
    <span className="font-ui text-[44px] font-semibold leading-[44px] tracking-[-0.02em]">
      <CountUp value={value} ms={HERO_MS} run={run} className="ob-gradient-text" />
    </span>
  );
}

export function Screen24({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const r = reportOf(ctx);
  const run = useFirstShow(ctx);
  const primary = { label: 'Continue', onClick: ctx.goNext };
  useStepKeys(ctx, primary);
  const reclaimLabel = r.reclaimMinutes === 60 ? '1 hour' : '30 minutes';
  const weekGoal = formatNumber(r.G * 7);

  return (
    <StepFrame
      {...frameProps(ctx)}
      wide
      overline="What's possible"
      titleId={titleId}
      title="Here's what your plan can give you."
      primary={primary}
      body={
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-12">
          <p className="font-display text-[28px] leading-[44px] text-ink">
            Turn just {reclaimLabel} of scrolling into focus each day and that&apos;s{' '}
            <HopeNumber value={r.reclaimHoursYear} run={run} /> hours a year. About{' '}
            <HopeNumber value={r.reclaimWeeks} run={run} /> weeks of full-time {studyWord(ctx.answers.profile_type)}.
          </p>
          <div>
            <div className="frost rounded-[20px] p-6">
              <h3 className="text-[16px] font-semibold leading-[22px] text-ink">Your plan for the next 12 weeks</h3>
              <div className="mt-2">
                <FocusChart weekly={r.weekly} weekLabel={`${weekGoal} h a week`} animate={run} />
              </div>
            </div>
            <p className="mt-4 text-[14px] leading-[22px] text-ink-2">
              Up to {formatNumber(r.total12)} focused hours in 12 weeks, if you follow your plan.
            </p>
            <p className="mt-2 text-[12px] leading-[16px] text-ink-3">
              Based on your goal of {formatNumber(r.G)} {hoursWord(r.G)} a day, building up over 6 weeks.
            </p>
          </div>
        </div>
      }
    />
  );
}

// ---------- 25 · Your plan ----------

export function Screen25({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const plan = ctx.plan ?? buildPlan(ctx.answers, ctx.flow.isPro);
  // "Save my plan" when screen 26 is skipped. It leads to screen 27, which P3 connects.
  const save = !isVisible(26, ctx.flow);
  const primary = { label: save ? 'Save my plan' : 'Continue', onClick: ctx.goNext };
  useStepKeys(ctx, primary);
  return (
    <StepFrame
      {...frameProps(ctx)}
      wide
      centered
      titleId={titleId}
      title="Your Focalyst plan."
      primary={primary}
      body={
        <PlanPreview
          answers={ctx.answers}
          skipped={ctx.skipped}
          isPro={ctx.flow.isPro}
          variant="card"
          onlyFilled
          rhythmNote={plan.note}
          className="mx-auto"
        />
      }
    />
  );
}

// ---------- 26 · Your plan goes with you ----------

export function Screen26({ ctx }: { ctx: ScreenCtx }) {
  const titleId = useId();
  const primary = { label: 'Save my plan', onClick: ctx.goNext };
  useStepKeys(ctx, primary);
  const app = (ctx.answers.distracting_apps ?? []).find((a) => a !== 'Other');

  const blocking = (
    <div className="frost w-full rounded-[20px] p-4 lg:w-[220px]">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary-text">
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold leading-[18px] text-ink">{app ? `${app} is paused` : 'Distracting apps are paused'}</p>
          <p className="text-[13px] leading-[18px] text-ink-2">Back to your focus session</p>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-[16px] text-ink-3">Gentle blocking is free. Strong modes are Pro.</p>
    </div>
  );

  return (
    <StepFrame
      {...frameProps(ctx)}
      wide
      titleId={titleId}
      title="Your plan goes with you."
      subtitle="On the Focalyst phone app, interactive widgets let you tick off tasks, log a habit and start focusing from your home screen. Blocking pauses distracting apps while you focus."
      primary={primary}
      aside={
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-end">
          <WidgetPreview answers={ctx.answers} plan={ctx.plan} isPro={ctx.flow.isPro} />
          {blocking}
        </div>
      }
      body={<p className="text-[13px] leading-[18px] text-ink-3">Log in on the app with the same account and your plan is already there.</p>}
    />
  );
}
