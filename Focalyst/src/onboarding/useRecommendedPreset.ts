import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RECOMMENDED_PRESET_KEY, RHYTHMS, type RhythmKey } from './plan';

// Section 6.1: the Focus tab pre-selects the plan's preset once. Focus doesn't store the user's own
// preset choice, so "never chose a preset" means: this is the first Focus visit after onboarding.

const APPLIED_KEY = 'onboarding:recommendedPreset:applied';

export function useRecommendedPreset({
  ready,
  isPro,
  busy,
  apply,
}: {
  /** The profile has loaded, so isPro is real. */
  ready: boolean;
  isPro: boolean;
  /** A session is running or being restored: leave the timer alone. */
  busy: boolean;
  apply: (focusMin: number, breakMin: number, sets: number) => void;
}) {
  const done = useRef(false);
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    if (!ready || busy || done.current) return;
    let cancelled = false;
    (async () => {
      try {
        const [key, applied] = await Promise.all([
          AsyncStorage.getItem(RECOMMENDED_PRESET_KEY),
          AsyncStorage.getItem(APPLIED_KEY),
        ]);
        if (cancelled || done.current) return;
        if (!key || applied || !(key in RHYTHMS)) {
          done.current = true;
          return;
        }
        const rhythm = RHYTHMS[key as RhythmKey];
        // Only if the plan allows it: the free plan has 25/5 only. Keep it for after an upgrade.
        if (!isPro && rhythm.key !== '25/5') return;
        done.current = true;
        applyRef.current(rhythm.focusMinutes, rhythm.breakMinutes, rhythm.rounds);
        await AsyncStorage.setItem(APPLIED_KEY, '1');
      } catch (e) {
        console.warn('[Onboarding] Failed to apply the recommended preset:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [busy, isPro, ready]);
}
