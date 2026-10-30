import type { OnboardingAnswers } from './draft';
import type { OnboardingReport } from './report';

// The complete_onboarding payload (IOS_ONBOARDING_DESIGN.md section 8.2). Pure.

export interface CompleteOnboardingPayload {
  name?: string;
  profile_type?: OnboardingAnswers['profile_type'];
  timezone: string;
  platform: 'ios' | 'android';
  acquisition_source?: OnboardingAnswers['acquisition_source'];
  life_stage?: OnboardingAnswers['life_stage'];
  distractions?: string[];
  distracting_apps?: string[];
  daily_phone_hours?: number;
  focus_drift_minutes?: number;
  best_focus_time?: OnboardingAnswers['best_focus_time'];
  daily_focus_goal_minutes?: number;
  reminder_time?: string;
  notifications_allowed?: boolean;
  blocking_set_up?: boolean;
  habits?: { name: string; icon: string }[];
  tasks?: string[];
  countdown?: { name: string; date: string; icon: string };
  group?: { mode: 'create' | 'join' | 'none'; habit_index: number };
  report: OnboardingReport;
  answers: OnboardingAnswers;
}

/** A real name: set and not an email. Such a name is never replaced. */
export function hasRealName(fullName: string | null | undefined): boolean {
  return !!fullName && fullName.trim().length > 0 && !fullName.includes('@');
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function buildCompletePayload({
  answers,
  report,
  existingFullName,
  platform = 'ios',
  timezone = deviceTimeZone(),
}: {
  answers: OnboardingAnswers;
  report: OnboardingReport;
  existingFullName: string | null | undefined;
  platform?: 'ios' | 'android';
  timezone?: string;
}): CompleteOnboardingPayload {
  const habits = answers.habits?.filter((h) => h.name.trim()) ?? [];
  const payload: CompleteOnboardingPayload = {
    timezone,
    platform,
    profile_type: answers.profile_type,
    acquisition_source: answers.acquisition_source,
    life_stage: answers.life_stage,
    distractions: answers.distractions,
    distracting_apps: answers.distracting_apps,
    daily_phone_hours: answers.daily_phone_hours,
    focus_drift_minutes: answers.focus_drift_minutes,
    best_focus_time: answers.best_focus_time,
    daily_focus_goal_minutes: answers.daily_focus_goal_minutes,
    reminder_time: answers.reminder_time,
    notifications_allowed: answers.notifications_allowed,
    blocking_set_up: answers.blocking_set_up,
    habits,
    tasks: answers.tasks?.filter((t) => t.trim()),
    countdown: answers.countdown,
    group:
      answers.group && habits.length > 0
        ? { mode: answers.group.mode, habit_index: answers.group.habit_index }
        : undefined,
    report,
    answers,
  };
  // Leave the name out when the account already has a real one, so it's never replaced.
  if (answers.name?.trim() && !hasRealName(existingFullName)) payload.name = answers.name.trim();

  // Drop missing fields rather than sending nulls.
  for (const key of Object.keys(payload) as (keyof CompleteOnboardingPayload)[]) {
    if (payload[key] === undefined) delete payload[key];
  }
  return payload;
}
