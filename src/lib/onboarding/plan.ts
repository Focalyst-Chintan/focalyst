// Plan builder helpers (WEB_ONBOARDING_DESIGN.md 7). Phase W4 adds the rest.
import type { DriftMinutes } from './draft';

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
