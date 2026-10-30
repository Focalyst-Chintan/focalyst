import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../utils/UserContext';
import { supabase } from '../utils/supabase';
import { useBlocking } from '../blocking/BlockingContext';
import { loadDraft, loadPostState, savePostState } from './draft';
import { GROUPS_LOCATION } from './copy';
import { PENDING_GROUP_KEY, hasPendingFinish, runFinish, runGroupStep, type PendingGroup } from './finish';

// Follow-ups on app open (IOS_ONBOARDING_DESIGN.md section 8.5), mounted once in the root layout.

export const PENDING_COUNTDOWN_CARD_KEY = 'onboarding:pendingCountdownCard';

export interface PendingCountdownCardData {
  name: string;
  /** YYYY-MM-DD */
  date: string;
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown | null) {
  try {
    if (value === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[Onboarding] Failed to update ${key}:`, e);
  }
}

/**
 * claim_pending_countdown() reports `created`, `needs_pro` or nothing to do. The exact shape lives
 * in Supabase, so read it loosely: a status string, or an object with status and the countdown.
 */
function parseClaim(data: unknown): { status: string; name?: string; date?: string } {
  if (typeof data === 'string') return { status: data };
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const status = String(d.status ?? d.result ?? '');
    const name = (d.name ?? d.event_name) as string | undefined;
    const rawDate = (d.date ?? d.target_date) as string | undefined;
    return { status, name, date: rawDate ? String(rawDate).slice(0, 10) : undefined };
  }
  return { status: '' };
}

export function OnboardingFollowUps() {
  const { user, profile, refreshProfile } = useUser();
  const { showSnackbar } = useBlocking();
  const ranFor = useRef<string | null>(null);
  const userId = user?.id as string | undefined;
  const onboarded = profile?.onboarding_done === true;

  useEffect(() => {
    if (!userId || ranFor.current === userId) return;
    ranFor.current = userId;

    (async () => {
      // 1. A save that failed earlier: retry it.
      if ((await hasPendingFinish()) && (await loadDraft())) {
        await runFinish(refreshProfile).catch(() => null);
      }

      // 2. A group step that was offline: retry once (the step checks the current group first).
      const pendingGroup = await readJson<PendingGroup>(PENDING_GROUP_KEY);
      if (pendingGroup) {
        const outcome = await runGroupStep(pendingGroup);
        const post = await loadPostState();
        if (post) await savePostState({ ...post, group: outcome });
        if (outcome.status === 'created' || outcome.status === 'existing') {
          showSnackbar(`Your group is ready. Share your code from ${GROUPS_LOCATION}.`);
        } else if (outcome.status === 'joined') {
          showSnackbar("You're in your friend's group.");
        } else if (outcome.status === 'failed') {
          await writeJson(PENDING_GROUP_KEY, null);
          showSnackbar(`We couldn't set up your group. Try again from ${GROUPS_LOCATION}.`);
        }
      }
    })();
  }, [refreshProfile, showSnackbar, userId]);

  // 3. A countdown saved as pending: create it once the plan allows.
  const claimedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || !onboarded || claimedFor.current === userId) return;
    claimedFor.current = userId;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('claim_pending_countdown');
        if (error) return;
        const claim = parseClaim(data);
        if (claim.status === 'created') {
          await writeJson(PENDING_COUNTDOWN_CARD_KEY, null);
          showSnackbar(claim.name ? `${claim.name} countdown added` : 'Countdown added');
        } else if (claim.status === 'needs_pro' && claim.name && claim.date) {
          await writeJson(PENDING_COUNTDOWN_CARD_KEY, { name: claim.name, date: claim.date });
        }
      } catch (e) {
        console.warn('[Onboarding] claim_pending_countdown failed:', e);
      }
    })();
  }, [onboarded, showSnackbar, userId]);

  return null;
}
