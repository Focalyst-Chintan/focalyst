import { supabase } from '../utils/supabase';
import type { OnboardingAnswers } from './draft';
import type { OnboardingReport } from './report';

// The user's own onboarding_profiles row (answers, report, completed_at), saved by complete_onboarding.

export interface OnboardingProfileRow {
  answers: OnboardingAnswers;
  report: OnboardingReport;
  completed_at: string;
}

/** Days the card stays at the top of Insights after onboarding (7.6). */
export const STARTING_REPORT_TOP_DAYS = 30;

export async function fetchOnboardingProfile(userId: string): Promise<OnboardingProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from('onboarding_profiles')
      .select('answers, report, completed_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data?.completed_at || !data.answers || !data.report) return null;
    return data as OnboardingProfileRow;
  } catch {
    return null;
  }
}

export function isRecent(completedAt: string, now = Date.now()): boolean {
  return now - new Date(completedAt).getTime() < STARTING_REPORT_TOP_DAYS * 86_400_000;
}
