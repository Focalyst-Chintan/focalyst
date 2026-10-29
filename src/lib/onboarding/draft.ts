// Onboarding draft and post-save state (WEB_ONBOARDING_DESIGN.md 2.3).
// Every storage access is wrapped in try/catch, with an in-memory fallback
// for private windows, blocked storage and quota errors.
import type { OnboardingPlan } from './plan';
import type { ReportSnapshot } from './report';

export type ProfileType = 'student' | 'professional' | 'freelancer' | 'creator' | 'entrepreneur';
export type LifeStage = 'school_exams' | 'college' | 'competitive_exam' | 'degree' | 'other';
export type AcquisitionSource = 'instagram' | 'youtube' | 'friend' | 'app_store' | 'google' | 'other';
export type DriftMinutes = 10 | 25 | 45 | 60;
export type BestFocusTime = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'late_night';
export type GroupMode = 'create' | 'join' | 'none';

export interface OnboardingHabit { name: string; icon: string }
export interface OnboardingGroup { mode: GroupMode; habit_index: 0 | 1; code?: string }
export interface OnboardingCountdown { name: string; date: string; icon: string }

/** All answers from section 4. A missing key means "not answered yet". */
export interface OnboardingAnswers {
  name?: string;                          // 5
  profile_type?: ProfileType;             // 6
  life_stage?: LifeStage;                 // 7 (students only)
  acquisition_source?: AcquisitionSource; // 8
  distractions?: string[];                // 9
  distracting_apps?: string[];            // 10 ([] = "None of these")
  daily_phone_hours?: number;             // 11 (1 to 10, 10 = "10+")
  focus_drift_minutes?: DriftMinutes;     // 13
  best_focus_time?: BestFocusTime;        // 14
  habits?: OnboardingHabit[];             // 15 (max 2)
  group?: OnboardingGroup;                // 16
  countdown?: OnboardingCountdown;        // 17
  tasks?: string[];                       // 18 (max 3)
  daily_focus_goal_minutes?: number;      // 19 (360 = "6 hours or more")
  reminder_time?: string;                 // 20 (HH:MM)
  notifications_allowed?: boolean;        // 20
  blocking_set_up?: false;                // 21 is never shown on the web
}

export type AnswerKey = keyof OnboardingAnswers;

export interface OnboardingDraft {
  step: number;
  answers: OnboardingAnswers;
  /** Answers the user skipped with a ghost Skip button. */
  skipped: AnswerKey[];
  /** Computed on screen 22 (sections 6 and 7). */
  report: ReportSnapshot | null;
  plan: OnboardingPlan | null;
  /** Screens whose count-up has played (23, 24), so back and forward don't replay it (3.7). */
  countedUp: number[];
  updatedAt: number;
}

/** Outcome of the group step in /onboarding/finish (8.5), shown on screen 31. */
export type GroupStepResult =
  | { status: 'created'; mode: 'create'; code: string | null; groupId: string | null }
  | { status: 'existing'; mode: GroupMode; code: string | null; groupId: string | null }
  | { status: 'joined'; mode: 'join'; groupId: string | null }
  | { status: 'failed'; mode: GroupMode; error: string }
  | { status: 'offline'; mode: GroupMode };

export interface OnboardingPostState {
  step: number;
  name: string;
  preset: string | null;
  habitName: string | null;
  group: GroupStepResult | null;
  countdownPending: boolean;
  checkoutPending: string | null;
  savedAt: number;
  /** The saved answers, for the plan panel and the screen 28 chat preview (the draft is gone by then). */
  answers?: OnboardingAnswers;
  skipped?: AnswerKey[];
  plan?: OnboardingPlan | null;
  /** The habit the group step used, for a real Try again on screen 31. */
  groupHabitId?: string | null;
  /** Set by the payment success page or an already_pro checkout: Pro from now on. */
  purchased?: boolean;
  /** The screen 28 reply has typed in once. */
  chatShown?: boolean;
}

export const DRAFT_KEY = 'onboarding:draft:v1';
export const POST_KEY = 'onboarding:post:v1';
export const PENDING_FINISH_KEY = 'onboarding:pendingFinish';
export const PENDING_GROUP_KEY = 'onboarding:pendingGroup';
export const PENDING_COUNTDOWN_KEY = 'onboarding:pendingCountdown';
/** Lets an onboarded account open /start for screens 28 to 32 after the save (read by the middleware). */
export const POST_COOKIE = 'onboarding_post';
const DAY = 24 * 60 * 60 * 1000;
export const DRAFT_TTL = 30 * DAY;
export const POST_TTL = 7 * DAY;

const memory = new Map<string, string>();

function getItem(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key);
    if (v !== null) return v;
  } catch { /* storage blocked */ }
  return memory.get(key) ?? null;
}

function setItem(key: string, value: string) {
  memory.set(key, value);
  try { window.localStorage.setItem(key, value); } catch { /* memory only */ }
}

function removeItem(key: string) {
  memory.delete(key);
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
}

function readJson<T>(key: string): T | null {
  const raw = getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function emptyDraft(step = 1): OnboardingDraft {
  return { step, answers: {}, skipped: [], report: null, plan: null, countedUp: [], updatedAt: Date.now() };
}

/** Returns the saved draft, or null when there is none or it is older than 30 days. */
export function readDraft(): OnboardingDraft | null {
  const d = readJson<Partial<OnboardingDraft>>(DRAFT_KEY);
  if (!d || typeof d !== 'object' || typeof d.step !== 'number') return null;
  if (!d.updatedAt || Date.now() - d.updatedAt > DRAFT_TTL) {
    removeItem(DRAFT_KEY);
    return null;
  }
  return {
    step: d.step,
    answers: d.answers && typeof d.answers === 'object' ? d.answers : {},
    skipped: Array.isArray(d.skipped) ? d.skipped : [],
    report: d.report ?? null,
    plan: d.plan ?? null,
    countedUp: Array.isArray(d.countedUp) ? d.countedUp.filter((n) => typeof n === 'number') : [],
    updatedAt: d.updatedAt,
  };
}

export function writeDraft(draft: OnboardingDraft): OnboardingDraft {
  const next = { ...draft, updatedAt: Date.now() };
  try { setItem(DRAFT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function clearDraft() {
  removeItem(DRAFT_KEY);
}

export function readPostState(): OnboardingPostState | null {
  const p = readJson<OnboardingPostState>(POST_KEY);
  if (!p || typeof p !== 'object' || typeof p.step !== 'number') return null;
  if (!p.savedAt || Date.now() - p.savedAt > POST_TTL) {
    removeItem(POST_KEY);
    return null;
  }
  return p;
}

export function writePostState(state: Omit<OnboardingPostState, 'savedAt'>): OnboardingPostState {
  const next = { ...state, savedAt: Date.now() };
  try { setItem(POST_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function clearPostState() {
  removeItem(POST_KEY);
  clearPostCookie();
}

/** complete_onboarding kept failing: the draft stays and the save is retried on a later app visit (8.3). */
export function setPendingFinish() {
  setItem(PENDING_FINISH_KEY, '1');
}

export function clearPendingFinish() {
  removeItem(PENDING_FINISH_KEY);
}

export function hasPendingFinish(): boolean {
  return getItem(PENDING_FINISH_KEY) === '1';
}

export interface PendingGroup { mode: 'create' | 'join'; habitId: string; code?: string }

/** The group step was offline or timed out: retried once per later app visit (8.5). */
export function writePendingGroup(g: PendingGroup) {
  setItem(PENDING_GROUP_KEY, JSON.stringify(g));
}

export function clearPendingGroup() {
  removeItem(PENDING_GROUP_KEY);
}

export function readPendingGroup(): PendingGroup | null {
  const g = readJson<PendingGroup>(PENDING_GROUP_KEY);
  if (!g || (g.mode !== 'create' && g.mode !== 'join') || typeof g.habitId !== 'string') return null;
  return g;
}

/**
 * A countdown complete_onboarding saved as pending (8.6). Kept on this device so the follow-ups know
 * to call claim_pending_countdown, and so the needs_pro card can name it.
 */
export interface PendingCountdown {
  name: string;
  date: string;
  status: 'pending' | 'needs_pro' | 'created';
  /** "Remove" on the needs_pro card: hidden on this device. */
  dismissed?: boolean;
}

export const PENDING_COUNTDOWN_EVENT = 'fx:onboarding-countdown';

export function readPendingCountdown(): PendingCountdown | null {
  return parsePendingCountdown(getItem(PENDING_COUNTDOWN_KEY));
}

/** The stored string, stable between reads (for useSyncExternalStore). */
export function readPendingCountdownRaw(): string | null {
  return getItem(PENDING_COUNTDOWN_KEY);
}

export function parsePendingCountdown(raw: string | null): PendingCountdown | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as PendingCountdown;
    return c && typeof c.name === 'string' ? c : null;
  } catch {
    return null;
  }
}

export function writePendingCountdown(c: PendingCountdown | null) {
  if (c) setItem(PENDING_COUNTDOWN_KEY, JSON.stringify(c));
  else removeItem(PENDING_COUNTDOWN_KEY);
  try { window.dispatchEvent(new CustomEvent(PENDING_COUNTDOWN_EVENT)); } catch { /* ignore */ }
}

export function setPostCookie() {
  try {
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `${POST_COOKIE}=1; path=/; max-age=${POST_TTL / 1000}; samesite=lax${secure}`;
  } catch { /* ignore */ }
}

export function clearPostCookie() {
  try { document.cookie = `${POST_COOKIE}=; path=/; max-age=0; samesite=lax`; } catch { /* ignore */ }
}

/** First word of the name, for greetings (section 5). */
export function firstName(name?: string | null): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}
