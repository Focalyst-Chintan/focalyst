// The onboarding step machine (WEB_ONBOARDING_DESIGN.md 2.2 and 4).
import type { OnboardingAnswers } from './draft';

export const FIRST_STEP = 1;
export const LAST_STEP = 32;

export const CHAPTERS = [
  { name: 'Welcome', label: 'WELCOME', from: 1, to: 3 },
  { name: 'About you', label: 'ABOUT YOU', from: 4, to: 8 },
  { name: 'Your focus right now', label: 'YOUR FOCUS RIGHT NOW', from: 9, to: 14 },
  { name: 'Your setup', label: 'YOUR SETUP', from: 15, to: 21 },
  { name: 'Your report', label: 'YOUR REPORT', from: 22, to: 26 },
  { name: 'Save and Pro', label: 'SAVE AND PRO', from: 27, to: 32 },
] as const;

export const STEP_NAMES: Record<number, string> = {
  1: 'Welcome', 2: 'One calm place', 3: 'Focalyst helps you',
  4: 'Intro', 5: 'Name', 6: 'Role', 7: 'Working towards', 8: 'Where you heard',
  9: 'What gets in the way', 10: 'Apps', 11: 'Phone time', 12: 'Got it', 13: 'Drift time', 14: 'Best time',
  15: 'Habits', 16: 'Habit group', 17: 'Countdown', 18: 'Tomorrow', 19: 'Daily goal', 20: 'Daily focus time', 21: 'Blocking',
  22: 'Building your plan', 23: 'Where your time goes', 24: "What's possible", 25: 'Your plan', 26: 'Your plan goes with you',
  27: 'Save your plan', 28: 'Your AI, with your plan', 29: 'Pro', 30: 'Paywall', 31: 'Your group', 32: "You're all set",
};

/** Screens that use wide mode (3.1). */
export const WIDE_STEPS = new Set([22, 23, 24, 25, 26, 30]);

/** Screens without a back button (3.2, 4). */
export const NO_BACK_STEPS = new Set([1, 22, 27, 28, 31, 32]);

export interface FlowState {
  answers: OnboardingAnswers;
  signedIn: boolean;
  isPro: boolean;
  native: boolean;
  hasStoreLink: boolean;
}

export function hasStoreLinkEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_APP_STORE_URL || process.env.NEXT_PUBLIC_PLAY_STORE_URL);
}

export function isVisible(step: number, s: FlowState): boolean {
  if (step < FIRST_STEP || step > LAST_STEP) return false;
  const a = s.answers;
  switch (step) {
    case 7: return a.profile_type === 'student';
    case 16: return (a.habits?.length ?? 0) > 0;
    case 21: return false;
    case 26: return s.hasStoreLink && !s.native;
    case 27: return !s.signedIn;
    case 28: case 29: case 30: return !s.isPro && !s.native;
    case 31: return (a.habits?.length ?? 0) > 0 && (a.group?.mode === 'create' || a.group?.mode === 'join');
    default: return true;
  }
}

export function next(step: number, s: FlowState): number | null {
  for (let k = step + 1; k <= LAST_STEP; k++) if (isVisible(k, s)) return k;
  return null;
}

export function prev(step: number, s: FlowState): number | null {
  for (let k = step - 1; k >= FIRST_STEP; k--) if (isVisible(k, s)) return k;
  return null;
}

/** Chapter index, 0 to 5. */
export function chapterOf(step: number): number {
  const i = CHAPTERS.findIndex((c) => step >= c.from && step <= c.to);
  return i === -1 ? 0 : i;
}

/**
 * Position of the step inside its chapter, counting only the steps the user will see.
 * Without a state every step in the range counts.
 */
export function progressWithinChapter(step: number, s?: FlowState): { index: number; total: number; fraction: number } {
  const c = CHAPTERS[chapterOf(step)];
  const steps: number[] = [];
  for (let k = c.from; k <= c.to; k++) if (!s || isVisible(k, s) || k === step) steps.push(k);
  const total = Math.max(1, steps.length);
  const index = Math.max(0, steps.indexOf(step));
  return { index, total, fraction: (index + 1) / total };
}
