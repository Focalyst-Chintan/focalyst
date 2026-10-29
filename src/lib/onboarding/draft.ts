// Onboarding draft and post-save state (WEB_ONBOARDING_DESIGN.md 2.3).
// Every storage access is wrapped in try/catch, with an in-memory fallback
// for private windows, blocked storage and quota errors.

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
  report: Record<string, unknown> | null;
  /** Stops the report count-ups replaying on back and forward (3.7). */
  countedUp: boolean;
  updatedAt: number;
}

export interface OnboardingPostState {
  step: number;
  name: string;
  preset: string | null;
  habitName: string | null;
  group: Record<string, unknown> | null;
  countdownPending: boolean;
  checkoutPending: string | null;
  savedAt: number;
}

export const DRAFT_KEY = 'onboarding:draft:v1';
export const POST_KEY = 'onboarding:post:v1';
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
  return { step, answers: {}, skipped: [], report: null, countedUp: false, updatedAt: Date.now() };
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
    countedUp: Boolean(d.countedUp),
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
}

/** First word of the name, for greetings (section 5). */
export function firstName(name?: string | null): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}
