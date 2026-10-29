// Plan builder (WEB_ONBOARDING_DESIGN.md 7).
import type { BestFocusTime, DriftMinutes, OnboardingAnswers } from './draft';

export interface Rhythm {
  /** What the user's plan uses. */
  label: string;
  /** The ideal rhythm when it is a Pro one and the user is free, for example "45/10". */
  proIdeal: string | null;
  /** Ideal session length in minutes. */
  minutes: 25 | 45 | 60;
}

export function rhythmFor(drift: DriftMinutes, isPro: boolean): Rhythm {
  if (drift === 45) return isPro ? { label: '45/10 × 3', proIdeal: null, minutes: 45 } : { label: '25/5 × 4', proIdeal: '45/10', minutes: 45 };
  if (drift === 60) return isPro ? { label: '60/15 × 2', proIdeal: null, minutes: 60 } : { label: '25/5 × 4', proIdeal: '60/15', minutes: 60 };
  return { label: '25/5 × 4', proIdeal: null, minutes: 25 };
}

/** Note under the rhythm on screen 25 (7.1). */
export function rhythmNote(drift: DriftMinutes, isPro: boolean): string {
  if (drift === 10) return 'Start with 25 minutes. It gets easier fast.';
  if (drift === 45) return isPro ? 'Longer, deeper sessions.' : 'Start with 25 minutes. Your ideal 45-minute sessions come with Pro.';
  if (drift === 60) return isPro ? 'Deep work blocks.' : 'Start with 25 minutes. Your ideal hour-long sessions come with Pro.';
  return 'The classic rhythm.';
}

/** Matches the Focus page presets (focus minutes, break minutes, sets). */
export interface FocusPreset {
  focusMinutes: number;
  breakMinutes: number;
  sets: number;
}

const PRESETS: Record<25 | 45 | 60, FocusPreset> = {
  25: { focusMinutes: 25, breakMinutes: 5, sets: 4 },
  45: { focusMinutes: 45, breakMinutes: 10, sets: 3 },
  60: { focusMinutes: 60, breakMinutes: 15, sets: 2 },
};

export interface OnboardingPlan {
  drift: DriftMinutes;
  /** The rhythm the plan uses: always 25/5 × 4 for free users. */
  preset: FocusPreset;
  /** "25/5", "45/10" or "60/15". */
  presetLabel: string;
  rhythmLabel: string;
  /** The ideal session length (25, 45 or 60), {minutes} on screens 28 and 29. */
  minutes: 25 | 45 | 60;
  /** 45 or 60 when the ideal rhythm is a Pro one the user doesn't have yet; otherwise null. */
  idealMinutes: 45 | 60 | null;
  /** "45/10 with Pro" for the plan card, or null. */
  proIdeal: string | null;
  note: string;
  version: 1;
}

/** Before sign-in everyone is treated as free (7.1). */
export function buildPlan(answers: OnboardingAnswers, isPro = false): OnboardingPlan {
  const drift = answers.focus_drift_minutes ?? 25;
  const r = rhythmFor(drift, isPro);
  const used: 25 | 45 | 60 = r.proIdeal ? 25 : r.minutes;
  const preset = PRESETS[used];
  return {
    drift,
    preset,
    presetLabel: `${preset.focusMinutes}/${preset.breakMinutes}`,
    rhythmLabel: r.label,
    minutes: r.minutes,
    idealMinutes: r.proIdeal ? (r.minutes as 45 | 60) : null,
    proIdeal: r.proIdeal ? `${r.proIdeal} with Pro` : null,
    note: rhythmNote(drift, isPro),
    version: 1,
  };
}

export const RECOMMENDED_PRESET_KEY = 'onboarding:recommendedPreset';

/** Saved for the Focus page, which selects it once (7.1). */
export function saveRecommendedPreset(plan: OnboardingPlan) {
  try {
    window.localStorage.setItem(
      RECOMMENDED_PRESET_KEY,
      JSON.stringify({ ...plan.preset, idealMinutes: plan.idealMinutes })
    );
  } catch { /* storage blocked */ }
}

/** Screen 20 chips from the best focus time (7.2). */
export const FOCUS_TIME_SUGGESTIONS: Record<BestFocusTime, string[]> = {
  early_morning: ['06:00', '06:30', '07:00'],
  morning: ['08:30', '09:00', '10:00'],
  afternoon: ['13:30', '14:00', '15:00'],
  evening: ['18:30', '19:00', '20:00'],
  late_night: ['21:30', '22:00', '22:30'],
};

export function focusTimeSuggestions(best?: BestFocusTime): string[] {
  return FOCUS_TIME_SUGGESTIONS[best ?? 'evening'];
}

/**
 * The Focus page selects the recommended preset once (7.1): the key is removed when read, and a rhythm
 * longer than 25/5 is returned only when the plan allows it.
 */
export function takeRecommendedPreset(isPro: boolean): FocusPreset | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(RECOMMENDED_PRESET_KEY);
    if (raw) window.localStorage.removeItem(RECOMMENDED_PRESET_KEY);
  } catch { return null; }
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<FocusPreset>;
    const match = Object.values(PRESETS).find(
      (x) => x.focusMinutes === p.focusMinutes && x.breakMinutes === p.breakMinutes && x.sets === p.sets
    );
    if (!match) return null;
    return match.focusMinutes === 25 || isPro ? match : null;
  } catch {
    return null;
  }
}
