// Group step after the save (WEB_ONBOARDING_DESIGN.md 8.5). Uses habitGroupService exactly as it is.
import {
  fetchMyGroupLeaderboard, formOrUpdateHabitGroup, joinHabitGroupByCode,
} from '@/lib/services/habitGroupService';
import { writePendingGroup, type GroupStepResult, type OnboardingGroup, type PendingGroup } from './draft';

export const GROUP_STEP_MS = 4000;

const TIMED_OUT = Symbol('timed out');

function withLimit<T>(work: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => resolve(TIMED_OUT), ms);
    work.then((v) => { window.clearTimeout(t); resolve(v); }, (e) => { window.clearTimeout(t); reject(e); });
  });
}

function offline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** The leaderboard check first, so a retry never creates or joins twice. */
async function attempt(group: OnboardingGroup, habitId: string): Promise<GroupStepResult> {
  const current = await fetchMyGroupLeaderboard();
  if (current.in_group) {
    return { status: 'existing', mode: group.mode, code: current.invite_code ?? null, groupId: current.group_id ?? null };
  }
  if (group.mode === 'create') {
    const res = await formOrUpdateHabitGroup(habitId);
    let code = res.invite_code && res.invite_code !== '------' ? res.invite_code : null;
    // Read the code the way the Accountability section does, when the create call didn't return one.
    if (!code) code = (await fetchMyGroupLeaderboard()).invite_code ?? null;
    return { status: 'created', mode: 'create', code, groupId: res.group_id ?? null };
  }
  const res = await joinHabitGroupByCode(group.code ?? '', habitId);
  return res.success
    ? { status: 'joined', mode: 'join', groupId: res.group_id ?? null }
    : { status: 'failed', mode: 'join', error: res.message || 'failed' };
}

/**
 * Runs only for "create" or "join". Returns null when there is nothing to do (no group, or no habit id:
 * skip quietly, and skip 31). Offline or over the 4 s limit: saves onboarding:pendingGroup for a later visit.
 */
export async function runGroupStep(group: OnboardingGroup | undefined, habitIds: string[]): Promise<GroupStepResult | null> {
  if (!group || (group.mode !== 'create' && group.mode !== 'join')) return null;
  const habitId = groupHabitId(group, habitIds);
  if (!habitId) return null;

  const pending = () => {
    writePendingGroup({ mode: group.mode as 'create' | 'join', habitId, code: group.code });
    return { status: 'offline', mode: group.mode } as GroupStepResult;
  };

  if (offline()) return pending();
  try {
    const r = await withLimit(attempt(group, habitId), GROUP_STEP_MS);
    return r === TIMED_OUT ? pending() : r;
  } catch (e) {
    if (offline()) return pending();
    return { status: 'failed', mode: group.mode, error: e instanceof Error ? e.message : 'failed' };
  }
}

/** The habit the group step uses: the picked one, else the first (8.5 step 1). */
export function groupHabitId(group: OnboardingGroup | undefined, habitIds: string[]): string | null {
  if (!group || (group.mode !== 'create' && group.mode !== 'join')) return null;
  return habitIds[group.habit_index] ?? habitIds[0] ?? null;
}

/**
 * One more real attempt (screen 31 "Try again", or the pending group on a later visit).
 * Returns null while still offline or timed out, so the caller can keep it pending.
 */
export async function retryGroup(g: PendingGroup): Promise<GroupStepResult | null> {
  if (offline()) return null;
  const group: OnboardingGroup = { mode: g.mode, habit_index: 0, code: g.code };
  try {
    const r = await withLimit(attempt(group, g.habitId), GROUP_STEP_MS);
    return r === TIMED_OUT ? null : r;
  } catch (e) {
    if (offline()) return null;
    return { status: 'failed', mode: g.mode, error: e instanceof Error ? e.message : 'failed' };
  }
}
