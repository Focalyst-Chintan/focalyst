import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { supabase } from '../utils/supabase';
import type { UserProfile } from '../utils/UserContext';
import {
  fetchMyGroupLeaderboard,
  formOrUpdateHabitGroup,
  joinHabitGroupByCode,
} from '../services/habitGroupService';
import {
  clearDraft,
  loadDraft,
  loadPostState,
  savePostState,
  type OnboardingAnswers,
  type OnboardingDraft,
  type OnboardingPostState,
} from './draft';
import { buildCompletePayload } from './payload';
import { buildFocusPlan, countdownPending } from './plan';
import { computeOnboardingReport } from './report';

// Saving the plan (IOS_ONBOARDING_DESIGN.md sections 8.2 and 8.3).

export const PENDING_FINISH_KEY = 'onboarding:pendingFinish';
export const PENDING_GROUP_KEY = 'onboarding:pendingGroup';

const RETRY_DELAYS_MS = [1000, 3000, 6000];
const RPC_TIMEOUT_MS = 12_000;
const GROUP_STEP_LIMIT_MS = 4000;

export interface CompleteOnboardingResult {
  habit_ids: string[];
  habits_created: number;
  tasks_created: number;
  countdown_created: boolean;
  countdown_pending: boolean;
}

export type GroupFailure = 'not_found' | 'full' | 'already_in_group' | 'other';

export type GroupOutcome =
  | { status: 'created' | 'joined' | 'existing'; code?: string; memberCount: number }
  | { status: 'failed'; reason: GroupFailure; message: string }
  | { status: 'pending' };

export interface PendingGroup {
  mode: 'create' | 'join';
  habitId: string;
  code?: string;
}

export type FinishOutcome =
  | { kind: 'welcome_back' }
  | { kind: 'saved'; post: OnboardingPostState }
  | { kind: 'pending'; post: OnboardingPostState }
  | { kind: 'no_session' }
  | { kind: 'no_draft' };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function setFlag(key: string, value: string | null) {
  try {
    if (value === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.warn(`[Onboarding] Failed to update ${key}:`, e);
  }
}

export async function hasPendingFinish(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PENDING_FINISH_KEY)) !== null;
  } catch {
    return false;
  }
}

function postFrom(
  draft: OnboardingDraft,
  isPro: boolean,
  result: CompleteOnboardingResult | null,
): OnboardingPostState {
  const report = draft.report ?? computeOnboardingReport(draft.answers);
  const plan = buildFocusPlan(draft.answers, isPro);
  return {
    step: 28,
    answers: draft.answers,
    report,
    plan: { effective: plan.effective.key, ideal: plan.ideal.key, proLocked: plan.proLocked, note: plan.note },
    group: null,
    countdownPending: result ? result.countdown_pending : countdownPending(draft.answers, isPro),
    savedAt: Date.now(),
  };
}

async function callComplete(payload: unknown): Promise<CompleteOnboardingResult> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1]);
    try {
      const { data, error } = await withTimeout(
        Promise.resolve(supabase.rpc('complete_onboarding', { p: payload })),
        RPC_TIMEOUT_MS,
      );
      if (error) throw error;
      return (data ?? {}) as CompleteOnboardingResult;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

// ─── Group step (8.3) ──────────────────────────────────────────────────────────

function classifyJoinError(message: string): GroupFailure {
  const m = message.toLowerCase();
  if (m.includes('full')) return 'full';
  if (m.includes('already')) return 'already_in_group';
  if (m.includes('invalid') || m.includes('not found') || m.includes('check the')) return 'not_found';
  return 'other';
}

async function groupStepOnce(pending: PendingGroup): Promise<GroupOutcome> {
  // Already in a group: never create or join a second one.
  const current = await fetchMyGroupLeaderboard();
  if (current.in_group) {
    return { status: 'existing', code: current.invite_code, memberCount: current.members.length };
  }
  if (pending.mode === 'create') {
    const created = await formOrUpdateHabitGroup(pending.habitId);
    return {
      status: created.already_in_group ? 'existing' : 'created',
      code: created.invite_code,
      memberCount: 1,
    };
  }
  const joined = await joinHabitGroupByCode((pending.code ?? '').trim(), pending.habitId);
  if (!joined.success) return { status: 'failed', reason: classifyJoinError(joined.message), message: joined.message };
  const after = await fetchMyGroupLeaderboard();
  return { status: 'joined', code: after.invite_code, memberCount: Math.max(1, after.members.length) };
}

/** Runs the group step within 4 s. Offline or timed out: saved as pendingGroup for the next app open. */
export async function runGroupStep(pending: PendingGroup): Promise<GroupOutcome> {
  try {
    const outcome = await withTimeout(groupStepOnce(pending), GROUP_STEP_LIMIT_MS);
    if (outcome.status !== 'failed') await setFlag(PENDING_GROUP_KEY, null);
    return outcome;
  } catch (e) {
    const net = await NetInfo.fetch().catch(() => null);
    const offline = (e instanceof Error && e.message === 'timeout') || net?.isConnected === false;
    if (offline) {
      await setFlag(PENDING_GROUP_KEY, JSON.stringify(pending));
      return { status: 'pending' };
    }
    const message = e instanceof Error ? e.message : String(e);
    return { status: 'failed', reason: 'other', message };
  }
}

export function pendingGroupFor(answers: OnboardingAnswers, habitIds: string[]): PendingGroup | null {
  const group = answers.group;
  if (!group || group.mode === 'none' || (answers.habits?.length ?? 0) === 0) return null;
  const habitId = habitIds[group.habit_index] ?? habitIds[0];
  if (!habitId) return null;
  return { mode: group.mode, habitId, code: group.code };
}

// ─── Finish (8.2) ──────────────────────────────────────────────────────────────

async function doFinish(refreshProfile: () => Promise<UserProfile | null>): Promise<FinishOutcome> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return { kind: 'no_session' };

  const draft = await loadDraft();
  if (!draft) {
    const post = await loadPostState();
    return post ? { kind: 'saved', post } : { kind: 'no_draft' };
  }

  const { data: row } = await supabase
    .from('users')
    .select('onboarding_done, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (row?.onboarding_done) {
    await clearDraft();
    return { kind: 'welcome_back' };
  }

  const report = draft.report ?? computeOnboardingReport(draft.answers);
  const payload = buildCompletePayload({
    answers: draft.answers,
    report,
    existingFullName: row?.full_name,
    platform: Platform.OS === 'android' ? 'android' : 'ios',
  });

  let result: CompleteOnboardingResult;
  try {
    result = await callComplete(payload);
  } catch (e) {
    console.warn('[Onboarding] complete_onboarding failed after retries:', e);
    // Keep the draft and carry on to the report; the next app open retries.
    await setFlag(PENDING_FINISH_KEY, '1');
    const post = postFrom({ ...draft, report }, false, null);
    await savePostState(post);
    return { kind: 'pending', post };
  }

  // Copy into the post state before deleting the draft.
  let post = postFrom({ ...draft, report }, false, result);
  await savePostState(post);
  await clearDraft();
  await setFlag(PENDING_FINISH_KEY, null);

  const profile = await refreshProfile().catch(() => null);
  if (profile?.isPro) {
    const plan = buildFocusPlan(draft.answers, true);
    post = {
      ...post,
      plan: { effective: plan.effective.key, ideal: plan.ideal.key, proLocked: false, note: plan.note },
    };
  }

  const pending = pendingGroupFor(draft.answers, result.habit_ids ?? []);
  if (pending) post = { ...post, group: await runGroupStep(pending) };

  await savePostState(post);
  return { kind: 'saved', post };
}

let inFlight: Promise<FinishOutcome> | null = null;

/** One finish at a time: a second mount of /onboarding/finish waits for the same run. */
export function runFinish(refreshProfile: () => Promise<UserProfile | null>): Promise<FinishOutcome> {
  if (!inFlight) inFlight = doFinish(refreshProfile).finally(() => (inFlight = null));
  return inFlight;
}
