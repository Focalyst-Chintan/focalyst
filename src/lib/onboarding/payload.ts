// The complete_onboarding payload (WEB_ONBOARDING_DESIGN.md 8.2 and 5).
import type { OnboardingAnswers, OnboardingCountdown, OnboardingDraft, OnboardingHabit } from './draft';
import { buildPlan } from './plan';
import { computeOnboardingReport, reportSnapshot, type ReportSnapshot } from './report';

export interface OnboardingPayload {
  name?: string;
  profile_type?: string;
  timezone: string;
  platform: 'web';
  acquisition_source?: string;
  life_stage?: string;
  distractions: string[];
  distracting_apps: string[];
  daily_phone_hours?: number;
  focus_drift_minutes?: number;
  best_focus_time?: string;
  daily_focus_goal_minutes?: number;
  reminder_time?: string;
  notifications_allowed: boolean;
  blocking_set_up: false;
  habits: OnboardingHabit[];
  tasks: string[];
  countdown?: OnboardingCountdown;
  group?: { mode: 'create' | 'join' | 'none'; habit_index: 0 | 1 };
  report: ReportSnapshot;
  answers: OnboardingAnswers;
}

export function timeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

/**
 * Builds the payload from the draft. `name` is left out when the account already has a full name
 * (typed at sign-up or from Google or Apple), so it isn't cut to the first name (5).
 * Keys the user never answered are left out; the list fields are always arrays.
 */
export function buildOnboardingPayload(draft: OnboardingDraft, opts: { hasFullName: boolean }): OnboardingPayload {
  const a = draft.answers;
  const name = a.name?.trim();
  const report = draft.report ?? reportSnapshot(computeOnboardingReport(a), buildPlan(a).presetLabel);
  const habits = (a.habits ?? []).slice(0, 2);
  const payload: OnboardingPayload = {
    timezone: timeZone(),
    platform: 'web',
    distractions: a.distractions ?? [],
    distracting_apps: a.distracting_apps ?? [],
    notifications_allowed: a.notifications_allowed ?? false,
    blocking_set_up: false,
    habits,
    tasks: (a.tasks ?? []).slice(0, 3),
    report,
    answers: a,
  };
  if (name && !opts.hasFullName) payload.name = name;
  if (a.profile_type) payload.profile_type = a.profile_type;
  if (a.acquisition_source) payload.acquisition_source = a.acquisition_source;
  if (a.life_stage) payload.life_stage = a.life_stage;
  if (a.daily_phone_hours !== undefined) payload.daily_phone_hours = a.daily_phone_hours;
  if (a.focus_drift_minutes !== undefined) payload.focus_drift_minutes = a.focus_drift_minutes;
  if (a.best_focus_time) payload.best_focus_time = a.best_focus_time;
  if (a.daily_focus_goal_minutes !== undefined) payload.daily_focus_goal_minutes = a.daily_focus_goal_minutes;
  if (a.reminder_time) payload.reminder_time = a.reminder_time;
  if (a.countdown?.name && a.countdown.date) payload.countdown = a.countdown;
  if (a.group && habits.length) {
    payload.group = { mode: a.group.mode, habit_index: a.group.habit_index === 1 && habits.length > 1 ? 1 : 0 };
  }
  return payload;
}
