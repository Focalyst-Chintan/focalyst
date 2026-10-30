'use client';
// Shared step wiring for the onboarding screens: context, keyboard and the pick-then-advance timer.
import { useEffect, useRef } from 'react';
import type { AnswerKey, OnboardingAnswers } from '@/lib/onboarding/draft';
import type { OnboardingPlan } from '@/lib/onboarding/plan';
import type { ReportSnapshot } from '@/lib/onboarding/report';
import type { FlowState } from '@/lib/onboarding/steps';
import type { FooterAction } from './OnboardingStage';
import { useOnboardingKeys } from './useOnboardingKeys';

export interface ScreenCtx {
  step: number;
  answers: OnboardingAnswers;
  skipped: AnswerKey[];
  flow: FlowState;
  set: <K extends AnswerKey>(key: K, value: OnboardingAnswers[K]) => void;
  skip: (key: AnswerKey) => void;
  goNext: () => void;
  goBack: () => void;
  showBack: boolean;
  direction: 'fwd' | 'back';
  notice: string | null;
  collageImages: boolean[];
  /** Screen 22 output, stored in the draft. */
  report: ReportSnapshot | null;
  plan: OnboardingPlan | null;
  storeReport: (report: ReportSnapshot, plan: OnboardingPlan) => void;
  /** Screens whose count-up has already played (3.7). */
  countedUp: number[];
  markCountedUp: (step: number) => void;
  /** "Save my plan": the login page in save-plan mode, or /onboarding/finish when already signed in. */
  savePlan: () => void;
}

export const ADVANCE_MS = 250;

/** Common footer and keyboard wiring for a step. */
export function useStepKeys(
  ctx: ScreenCtx,
  primary: FooterAction | null,
  pick?: { count: number; onPick: (i: number) => void },
  onEscape?: () => void
) {
  useOnboardingKeys({
    canContinue: Boolean(primary && !primary.disabled),
    onEnter: primary?.onClick,
    onBack: ctx.showBack ? ctx.goBack : undefined,
    optionCount: pick?.count ?? 0,
    onPick: pick?.onPick,
    onEscape,
  });
}

/** Pick, save at once, then advance after 250 ms. */
export function useAdvanceAfterPick(goNext: () => void) {
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  return () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(goNext, ADVANCE_MS);
  };
}

export function frameProps(ctx: ScreenCtx) {
  return { showBack: ctx.showBack, onBack: ctx.goBack, direction: ctx.direction, notice: ctx.notice };
}
