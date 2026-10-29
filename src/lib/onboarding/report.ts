// Report maths (WEB_ONBOARDING_DESIGN.md 6). Pure functions only, the same formulas as the phone app.
import type { OnboardingAnswers } from './draft';

export interface OnboardingReport {
  /** Daily phone hours (screen 11; "10+" counts as 10). */
  H: number;
  /** Daily goal in hours (screen 19; "6 or more" counts as 6). */
  G: number;
  /** Drift minutes (screen 13). */
  D: number;
  yearlyPhoneHours: number;
  wakingDays: number;
  weeklyHours: number;
  reclaimMinutes: 30 | 60;
  reclaimLabel: string;
  reclaimHoursYear: number;
  reclaimWeeks: number;
  /** Planned focus hours for weeks 1 to 12. */
  weekly: number[];
  total12: number;
  /** 6.3: at 1 hour a day the report reads as a healthy base, not a warning. */
  healthyBase: boolean;
}

/** Saved in the payload as `report` (6.3). */
export interface ReportSnapshot {
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
  preset: string;
  version: 1;
}

export function reportInputs(answers: OnboardingAnswers): { H: number; G: number; D: number } {
  const h = answers.daily_phone_hours;
  const H = typeof h === 'number' && h > 0 ? Math.min(10, h) : 1;
  const g = answers.daily_focus_goal_minutes;
  const G = typeof g === 'number' && g > 0 ? Math.min(6, g / 60) : 2;
  const D = answers.focus_drift_minutes ?? 25;
  return { H, G, D };
}

/** Focus hours planned in week k (1 to 12): 40% in week 1, building up to the full goal by week 6. */
export function ramp(k: number): number {
  return Math.min(1, 0.4 + 0.12 * (k - 1));
}

export function computeOnboardingReport(answers: OnboardingAnswers): OnboardingReport {
  const { H, G, D } = reportInputs(answers);

  const yearlyPhoneHours = Math.round(H * 365);
  const wakingDays = Math.round(yearlyPhoneHours / 16);
  const weeklyHours = Math.round(H * 7 * 10) / 10;

  const reclaimMinutes = H >= 2 ? 60 : 30;
  const reclaimLabel = reclaimMinutes === 60 ? '1 hour' : '30 minutes';
  const reclaimHoursYear = Math.round((reclaimMinutes / 60) * 365);
  const reclaimWeeks = Math.floor(reclaimHoursYear / 40);

  const weekly = Array.from({ length: 12 }, (_, i) => Math.round(G * 7 * ramp(i + 1) * 10) / 10);
  const total12 = Math.round(weekly.reduce((a, b) => a + b, 0));

  return {
    H, G, D,
    yearlyPhoneHours, wakingDays, weeklyHours,
    reclaimMinutes, reclaimLabel, reclaimHoursYear, reclaimWeeks,
    weekly, total12,
    healthyBase: H <= 1,
  };
}

export function reportSnapshot(r: OnboardingReport, preset: string): ReportSnapshot {
  return {
    H: r.H,
    G: r.G,
    yearlyPhoneHours: r.yearlyPhoneHours,
    wakingDays: r.wakingDays,
    weeklyHours: r.weeklyHours,
    reclaimMinutes: r.reclaimMinutes,
    reclaimHoursYear: r.reclaimHoursYear,
    reclaimWeeks: r.reclaimWeeks,
    weekly: r.weekly,
    total12: r.total12,
    preset,
    version: 1,
  };
}

/** Screen 23 line under the hero number. */
export function heroLine(r: Pick<OnboardingReport, 'healthyBase'>): string {
  return r.healthyBase ? 'hours a year on your phone. A healthy base to build on.' : 'hours on your phone this year';
}
