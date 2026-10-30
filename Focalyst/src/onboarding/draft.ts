import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StepId } from './steps';

// ─── Answer types (IOS_ONBOARDING_DESIGN.md section 4) ─────────────────────────

export type ProfileType = 'student' | 'professional' | 'freelancer' | 'creator' | 'entrepreneur';
export type LifeStage = 'school_exams' | 'college' | 'competitive_exam' | 'degree' | 'other';
export type AcquisitionSource = 'instagram' | 'youtube' | 'friend' | 'app_store' | 'google' | 'other';
export type BestFocusTime = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'late_night';
export type DriftMinutes = 10 | 25 | 45 | 60;

export interface HabitChoice {
  name: string;
  icon: string;
}

export interface GroupChoice {
  mode: 'create' | 'join' | 'none';
  habit_index: number;
  code?: string;
}

export interface CountdownChoice {
  name: string;
  /** YYYY-MM-DD */
  date: string;
  icon: string;
}

export interface OnboardingAnswers {
  name?: string;
  profile_type?: ProfileType;
  life_stage?: LifeStage;
  acquisition_source?: AcquisitionSource;
  distractions?: string[];
  distracting_apps?: string[];
  /** 1 to 10 in steps of 0.5; 10 means "10+" */
  daily_phone_hours?: number;
  focus_drift_minutes?: DriftMinutes;
  best_focus_time?: BestFocusTime;
  habits?: HabitChoice[];
  group?: GroupChoice;
  countdown?: CountdownChoice;
  tasks?: string[];
  daily_focus_goal_minutes?: number;
  /** HH:mm, 24-hour */
  reminder_time?: string;
  notifications_allowed?: boolean;
  blocking_set_up?: boolean;
}

import type { OnboardingReport } from './report';
import type { RhythmKey } from './plan';
import type { GroupOutcome } from './finish';
export type { OnboardingReport };

export interface OnboardingDraft {
  step: StepId;
  answers: OnboardingAnswers;
  report: OnboardingReport | null;
  /** Keys of count-ups that already ran, so they don't replay on back and forward. */
  countedUp: string[];
  updatedAt: number;
}

export interface OnboardingPostState {
  step: StepId;
  answers: OnboardingAnswers;
  report: OnboardingReport | null;
  plan: { effective: RhythmKey; ideal: RhythmKey; proLocked: boolean; note: string } | null;
  /** The group step's result (8.3); null when there was no group to set up. */
  group: GroupOutcome | null;
  /** Habits created by complete_onboarding, so screen 31 can retry a join. */
  habitIds?: string[];
  countdownPending: boolean;
  savedAt: number;
}

// ─── Storage ───────────────────────────────────────────────────────────────────

export const DRAFT_KEY = 'onboarding:draft:v1';
export const POST_KEY = 'onboarding:post:v1';

const DAY_MS = 24 * 60 * 60 * 1000;
const DRAFT_TTL_MS = 30 * DAY_MS;
const POST_TTL_MS = 7 * DAY_MS;

export function emptyDraft(step: StepId): OnboardingDraft {
  return { step, answers: {}, report: null, countedUp: [], updatedAt: Date.now() };
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (e) {
    console.warn(`[Onboarding] Failed to read ${key}:`, e);
    return null;
  }
}

async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn(`[Onboarding] Failed to remove ${key}:`, e);
  }
}

// Writes are chained so a slow earlier write can never land after a newer one.
let writeChain: Promise<void> = Promise.resolve();

function writeJson(key: string, value: unknown): Promise<void> {
  writeChain = writeChain.then(async () => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[Onboarding] Failed to write ${key}:`, e);
    }
  });
  return writeChain;
}

export async function loadDraft(): Promise<OnboardingDraft | null> {
  const draft = await readJson<OnboardingDraft>(DRAFT_KEY);
  if (!draft || typeof draft.step !== 'number' || !draft.answers) return null;
  if (Date.now() - (draft.updatedAt ?? 0) > DRAFT_TTL_MS) {
    await removeKey(DRAFT_KEY);
    return null;
  }
  return { ...draft, countedUp: draft.countedUp ?? [], report: draft.report ?? null };
}

export function saveDraft(draft: OnboardingDraft): Promise<void> {
  return writeJson(DRAFT_KEY, { ...draft, updatedAt: Date.now() });
}

export async function hasDraft(): Promise<boolean> {
  return (await loadDraft()) !== null;
}

/** Only call once complete_onboarding has succeeded (section 2.2). */
export function clearDraft(): Promise<void> {
  writeChain = writeChain.then(() => removeKey(DRAFT_KEY));
  return writeChain;
}

export async function loadPostState(): Promise<OnboardingPostState | null> {
  const post = await readJson<OnboardingPostState>(POST_KEY);
  if (!post) return null;
  if (Date.now() - (post.savedAt ?? 0) > POST_TTL_MS) {
    await removeKey(POST_KEY);
    return null;
  }
  return post;
}

export function savePostState(post: OnboardingPostState): Promise<void> {
  return writeJson(POST_KEY, post);
}

export function clearPostState(): Promise<void> {
  writeChain = writeChain.then(() => removeKey(POST_KEY));
  return writeChain;
}
