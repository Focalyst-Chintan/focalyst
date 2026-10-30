import type { OnboardingAnswers } from './draft';
import { DEFAULT_DRIFT, goalHours, idealRhythm, type RhythmKey } from './plan';

// Report maths (IOS_ONBOARDING_DESIGN.md section 5). Pure.
// Guardrails: never round up to make it scarier; always show the basis.

export interface OnboardingReport {
  H: number;
  G: number;
  yearlyPhoneHours: number;
  wakingDays: number;
  weeklyHours: number;
  reclaimMinutes: number;
  reclaimHoursYear: number;
  reclaimWeeks: number;
  weekly: number[];
  total12: number;
  preset: RhythmKey;
  idealMinutes: number;
  version: 1;
}

/** Build-up from 40% of the goal in week 1 to 100% by week 6. */
export const ramp = (k: number) => Math.min(1, 0.4 + 0.12 * (k - 1));

export function computeOnboardingReport(answers: OnboardingAnswers): OnboardingReport {
  const H = Math.min(10, answers.daily_phone_hours ?? 1); // "10+" = 10
  const G = goalHours(answers);
  const ideal = idealRhythm(answers.focus_drift_minutes ?? DEFAULT_DRIFT);

  const yearlyPhoneHours = Math.round(H * 365);
  const wakingDays = Math.round(yearlyPhoneHours / 16);
  const weeklyHours = Math.round(H * 7 * 10) / 10;
  const reclaimMinutes = H >= 2 ? 60 : 30;
  const reclaimHoursYear = Math.round((reclaimMinutes / 60) * 365);
  const reclaimWeeks = Math.floor(reclaimHoursYear / 40);
  const weekly = Array.from({ length: 12 }, (_, i) => Math.round(G * 7 * ramp(i + 1) * 10) / 10);
  const total12 = Math.round(weekly.reduce((a, b) => a + b, 0));

  return {
    H,
    G,
    yearlyPhoneHours,
    wakingDays,
    weeklyHours,
    reclaimMinutes,
    reclaimHoursYear,
    reclaimWeeks,
    weekly,
    total12,
    preset: ideal.key,
    idealMinutes: ideal.focusMinutes,
    version: 1,
  };
}

export function reclaimLabel(report: Pick<OnboardingReport, 'reclaimMinutes'>): string {
  return report.reclaimMinutes === 60 ? '1 hour' : '30 minutes';
}

export function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
  } catch {
    return String(n);
  }
}
