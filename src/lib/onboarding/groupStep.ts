// Group step after the save (WEB_ONBOARDING_DESIGN.md 8.5). Uses habitGroupService exactly as it is.
import {
  fetchMyGroupLeaderboard, formOrUpdateHabitGroup, joinHabitGroupByCode,
} from '@/lib/services/habitGroupService';
import { writePendingGroup, type GroupStepResult, type OnboardingGroup } from './draft';

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
  const habitId = habitIds[group.habit_index] ?? habitIds[0];
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
