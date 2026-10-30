import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BestFocusTime, DriftMinutes, OnboardingAnswers } from './draft';

// Plan builder (IOS_ONBOARDING_DESIGN.md section 6). Pure, except saveRecommendedPreset.

export type RhythmKey = '25/5' | '45/10' | '60/15';

export interface Rhythm {
  key: RhythmKey;
  focusMinutes: number;
  breakMinutes: number;
  rounds: number;
}

export const RHYTHMS: Record<RhythmKey, Rhythm> = {
  '25/5': { key: '25/5', focusMinutes: 25, breakMinutes: 5, rounds: 4 },
  '45/10': { key: '45/10', focusMinutes: 45, breakMinutes: 10, rounds: 3 },
  '60/15': { key: '60/15', focusMinutes: 60, breakMinutes: 15, rounds: 2 },
};

/** The free plan has the 25/5 timer only. */
export const FREE_RHYTHM = RHYTHMS['25/5'];

export const DEFAULT_DRIFT: DriftMinutes = 25;

export function idealRhythm(drift: DriftMinutes | undefined): Rhythm {
  switch (drift ?? DEFAULT_DRIFT) {
    case 45:
      return RHYTHMS['45/10'];
    case 60:
      return RHYTHMS['60/15'];
    default:
      return RHYTHMS['25/5'];
  }
}

export function rhythmLabel(r: Rhythm): string {
  return `${r.key} × ${r.rounds}`;
}

export interface FocusPlan {
  ideal: Rhythm;
  /** What the user can use now: the ideal rhythm on Pro, 25/5 on the free plan. */
  effective: Rhythm;
  /** The ideal rhythm is longer than the plan allows: show the Pro chip. */
  proLocked: boolean;
  note: string;
}

const NOTES: Record<DriftMinutes, { free: string; pro: string }> = {
  10: { free: 'Start with 25 minutes. It gets easier fast.', pro: 'Start with 25 minutes. It gets easier fast.' },
  25: { free: 'The classic rhythm.', pro: 'The classic rhythm.' },
  45: { free: 'Start with 25 minutes. Your ideal 45-minute sessions come with Pro.', pro: 'Longer, deeper sessions.' },
  60: { free: 'Start with 25 minutes. Your ideal hour-long sessions come with Pro.', pro: 'Deep work blocks.' },
};

/** Before sign-in everyone counts as free; after sign-in, pass the existing Pro check. */
export function buildFocusPlan(answers: OnboardingAnswers, isPro: boolean): FocusPlan {
  const drift = answers.focus_drift_minutes ?? DEFAULT_DRIFT;
  const ideal = idealRhythm(drift);
  const effective = isPro ? ideal : FREE_RHYTHM;
  return {
    ideal,
    effective,
    proLocked: effective.key !== ideal.key,
    note: isPro ? NOTES[drift].pro : NOTES[drift].free,
  };
}

// ─── Reminder suggestions (6.2) ─────────────────────────────────────────────────

const REMINDER_CHIPS: Record<BestFocusTime, [string, string, string]> = {
  early_morning: ['06:00', '06:30', '07:00'],
  morning: ['08:30', '09:00', '10:00'],
  afternoon: ['13:30', '14:00', '15:00'],
  evening: ['18:30', '19:00', '20:00'],
  late_night: ['21:30', '22:00', '22:30'],
};

export function reminderSuggestions(best: BestFocusTime | undefined): string[] {
  return REMINDER_CHIPS[best ?? 'morning'];
}

/** answers.reminder_time, or the first chip for their best time (7.5). */
export function reminderTimeOf(answers: OnboardingAnswers): string {
  return answers.reminder_time ?? reminderSuggestions(answers.best_focus_time)[0];
}

export function timeToDate(hhmm: string, base = new Date()): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export function dateToTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** In the device's 12 or 24-hour format. */
export function formatTime(hhmm: string): string {
  return timeToDate(hhmm).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// ─── Goal and countdown helpers ────────────────────────────────────────────────

/** G in hours: "6 or more" = 6, default 2. */
export function goalHours(answers: OnboardingAnswers): number {
  const minutes = answers.daily_focus_goal_minutes;
  return minutes ? Math.min(6, minutes / 60) : 2;
}

export function hoursLabel(h: number): string {
  return `${h} ${h === 1 ? 'hour' : 'hours'}`;
}

/** Free countdowns can be up to 30 days away. */
export const FREE_COUNTDOWN_MAX_DAYS = 30;

export function daysUntil(isoDate: string, today = new Date()): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - now) / 86_400_000);
}

export function countdownPending(answers: OnboardingAnswers, isPro: boolean, today = new Date()): boolean {
  if (!answers.countdown || isPro) return false;
  return daysUntil(answers.countdown.date, today) > FREE_COUNTDOWN_MAX_DAYS;
}

// ─── Recommended preset (the Focus tab pre-selects it once, in P4) ─────────────

export const RECOMMENDED_PRESET_KEY = 'onboarding:recommendedPreset';

export async function saveRecommendedPreset(key: RhythmKey): Promise<void> {
  try {
    await AsyncStorage.setItem(RECOMMENDED_PRESET_KEY, key);
  } catch (e) {
    console.warn('[Onboarding] Failed to save the recommended preset:', e);
  }
}
