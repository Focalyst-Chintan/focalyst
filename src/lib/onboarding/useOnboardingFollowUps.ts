'use client';
// Follow-ups after the onboarding save (WEB_ONBOARDING_DESIGN.md 8.3, 8.5 and 8.6), once per app visit:
// the pending finish retry, the pending group retry and claim_pending_countdown.
import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { hasPro } from '@/lib/billing/proStatus';
import { useToast } from '@/components/desktop/ui/Toast';
import {
  clearDraft, clearPendingFinish, clearPendingGroup, hasPendingFinish, readDraft, readPendingCountdown,
  readPendingGroup, writePendingCountdown, type GroupStepResult,
} from './draft';
import { retryGroup, runGroupStep } from './groupStep';
import { buildOnboardingPayload } from './payload';
import { buildPlan, saveRecommendedPreset } from './plan';

type Toast = ReturnType<typeof useToast>;

export const GROUP_READY = 'Your group is ready';
export const GROUP_FAILED = "That invite code didn't work. Try again from Plan › Habits.";

/** Toast for a group result that came in after the flow (8.5 step 6). Offline stays quiet. */
function toastGroup(toast: Toast, r: GroupStepResult | null) {
  if (!r || r.status === 'offline') return;
  if (r.status === 'failed') toast.show(GROUP_FAILED, 'error');
  else toast.show(GROUP_READY, 'success');
}

interface ClaimResult {
  created?: boolean;
  reason?: string;
  name?: string;
  title?: string;
}

/**
 * claim_pending_countdown (8.6), only when this device saved a pending countdown.
 * Returns the countdown's state afterwards: created, needs_pro, or null when nothing is pending any more.
 */
export async function claimPendingCountdown(): Promise<'created' | 'needs_pro' | 'pending' | null> {
  const pending = readPendingCountdown();
  if (!pending || pending.status === 'created') return pending?.status ?? null;
  try {
    const { data, error } = await createClient().rpc('claim_pending_countdown');
    if (error) return pending.status; // try again on a later visit
    const r = (data ?? {}) as ClaimResult;
    const name = r.name || r.title || pending.name;
    if (r.created) {
      writePendingCountdown({ ...pending, name, status: 'created' });
      return 'created';
    }
    if (r.reason === 'needs_pro') {
      writePendingCountdown({ ...pending, name, status: 'needs_pro' });
      return 'needs_pro';
    }
    // Nothing pending on the account any more (added elsewhere, or removed).
    writePendingCountdown(null);
    return null;
  } catch {
    return pending.status;
  }
}

/** "{name} countdown added", once, after the claim created it. */
export function announceCreatedCountdown(toast: Toast) {
  const c = readPendingCountdown();
  if (c?.status !== 'created') return;
  writePendingCountdown(null);
  toast.show(`${c.name} countdown added`, 'success');
}

/** complete_onboarding failed during /onboarding/finish: one more try on this visit (8.3). */
async function retryPendingFinish(refresh: () => Promise<void>, toast: Toast) {
  const draft = readDraft();
  if (!hasPendingFinish() || !draft) {
    clearPendingFinish();
    return;
  }
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return;
  const { data: row } = await supabase
    .from('users')
    .select('onboarding_done, full_name, plan, plan_expires_at')
    .eq('id', user.id)
    .single();
  if (row?.onboarding_done) {
    clearDraft();
    clearPendingFinish();
    return;
  }
  const payload = buildOnboardingPayload(draft, { hasFullName: Boolean(row?.full_name?.trim()) });
  const { data, error } = await supabase.rpc('complete_onboarding', { p: payload });
  if (error) return; // still pending: the next visit tries again

  const result = (data ?? {}) as { habit_ids?: string[]; countdown_pending?: boolean };
  clearDraft();
  clearPendingFinish();
  saveRecommendedPreset(buildPlan(draft.answers, hasPro(row)));
  const cd = draft.answers.countdown;
  if (result.countdown_pending && cd) writePendingCountdown({ name: cd.name, date: cd.date, status: 'pending' });
  try { await refresh(); } catch { /* refreshes on its own later */ }
  const group = await runGroupStep(draft.answers.group, Array.isArray(result.habit_ids) ? result.habit_ids : []);
  toastGroup(toast, group);
}

/** The pending group from an offline finish: the leaderboard check first, so it never doubles (8.5). */
async function retryPendingGroup(toast: Toast) {
  const g = readPendingGroup();
  if (!g) return;
  const r = await retryGroup(g);
  if (!r) return; // still offline or timed out
  clearPendingGroup();
  toastGroup(toast, r);
}

let ranFor: string | null = null;

/** Mount once in the signed-in app layout. */
export function useOnboardingFollowUps() {
  const { user, refreshUserProfile } = useAuth();
  const toast = useToast();
  const refreshRef = useRef(refreshUserProfile);
  const toastRef = useRef(toast);
  useEffect(() => { refreshRef.current = refreshUserProfile; toastRef.current = toast; });
  const uid = user?.id ?? null;

  useEffect(() => {
    if (!uid || ranFor === uid) return;
    ranFor = uid;
    const t = toastRef.current;
    (async () => {
      try {
        // Read before the finish retry, which may write a fresh pending group itself.
        const hadPendingGroup = Boolean(readPendingGroup());
        await retryPendingFinish(() => refreshRef.current(), t);
        if (hadPendingGroup) await retryPendingGroup(t);
        announceCreatedCountdown(t);
        if ((await claimPendingCountdown()) === 'created') announceCreatedCountdown(t);
      } catch { /* follow-ups never break the app */ }
    })();
  }, [uid]);
}

export default useOnboardingFollowUps;
