import type { OnboardingAnswers } from './draft';

// Screen numbers match the web onboarding. 29 and 30 are replaced by the existing paywall.
export const STEPS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32,
] as const;

export type StepId = (typeof STEPS)[number];

export interface StepContext {
  answers: OnboardingAnswers;
  /** Signed in before or during the flow: screens 1 to 3 and 27 are skipped. */
  signedIn: boolean;
  /** After saving: false when the group step had nothing to set up, so screen 31 is skipped. */
  hasGroupResult?: boolean;
}

const CHAPTERS: readonly (readonly StepId[])[] = [
  [1, 2, 3],
  [4, 5, 6, 7, 8],
  [9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
  [22, 23, 24, 25, 26],
  [27, 28, 31, 32],
];

export const CHAPTER_COUNT = CHAPTERS.length;

/** The first screen for someone who arrives already signed in (routing table 2.1). */
export const SIGNED_IN_START: StepId = 4;

const NO_BACK: readonly StepId[] = [1, 22, 27, 28, 31, 32];

export function isStepId(value: unknown): value is StepId {
  return typeof value === 'number' && (STEPS as readonly number[]).includes(value);
}

export function isSkipped(step: StepId, { answers, signedIn, hasGroupResult }: StepContext): boolean {
  const hasHabits = (answers.habits?.length ?? 0) > 0;
  switch (step) {
    case 1:
    case 2:
    case 3:
    case 27:
      return signedIn;
    case 7:
      return answers.profile_type !== 'student';
    case 16:
      return !hasHabits;
    case 31:
      return !hasHabits || !answers.group || answers.group.mode === 'none' || hasGroupResult === false;
    default:
      return false;
  }
}

export function next(step: StepId, ctx: StepContext): StepId | null {
  for (let i = STEPS.indexOf(step) + 1; i < STEPS.length; i++) {
    if (!isSkipped(STEPS[i], ctx)) return STEPS[i];
  }
  return null;
}

export function prev(step: StepId, ctx: StepContext): StepId | null {
  if (NO_BACK.includes(step)) return null;
  for (let i = STEPS.indexOf(step) - 1; i >= 0; i--) {
    const candidate = STEPS[i];
    // Never go back into the signed-out welcome or past a save point.
    if (NO_BACK.includes(candidate) && candidate !== 1) return null;
    if (!isSkipped(candidate, ctx)) return candidate;
  }
  return null;
}

/** Moves a resumed step forward to the nearest screen that applies to this user. */
export function normalize(step: StepId, ctx: StepContext): StepId {
  const floor = ctx.signedIn && step < SIGNED_IN_START ? SIGNED_IN_START : step;
  return isSkipped(floor, ctx) ? (next(floor, ctx) ?? floor) : floor;
}

/** 0-based chapter index (0 to 5). */
export function chapterOf(step: StepId): number {
  return CHAPTERS.findIndex((chapter) => chapter.includes(step));
}

/** How far through its chapter this step is, from just above 0 to 1. */
export function progressWithinChapter(step: StepId, ctx: StepContext): number {
  const visible = CHAPTERS[chapterOf(step)].filter((s) => s === step || !isSkipped(s, ctx));
  return (visible.indexOf(step) + 1) / visible.length;
}

export function canGoBack(step: StepId, ctx: StepContext): boolean {
  return prev(step, ctx) !== null;
}
