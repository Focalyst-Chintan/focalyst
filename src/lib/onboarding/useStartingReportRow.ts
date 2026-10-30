'use client';
// The user's own onboarding_profiles row for the starting report in the app (WEB_ONBOARDING_REPORT.md R2 and R7).
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/lib/data/useData';
import type { OnboardingAnswers } from './draft';
import type { ReportSnapshot } from './report';

export interface StartingReportRow {
  answers: OnboardingAnswers;
  report: Partial<ReportSnapshot> | null;
  completed_at: string | null;
}

/** null when there is no row (no card, no page content). The row policy limits the read to the user. */
export function useStartingReportRow() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const { data, isLoading } = useData<StartingReportRow | null>(uid ? `onboarding-profile:${uid}` : null, async () => {
    const { data: row, error } = await createClient()
      .from('onboarding_profiles')
      .select('answers, report, completed_at')
      .eq('user_id', uid as string)
      .maybeSingle();
    if (error) throw error;
    if (!row || !row.answers || typeof row.answers !== 'object') return null;
    return {
      answers: row.answers as OnboardingAnswers,
      report: row.report && typeof row.report === 'object' ? (row.report as Partial<ReportSnapshot>) : null,
      completed_at: typeof row.completed_at === 'string' ? row.completed_at : null,
    };
  });
  return { row: data ?? null, isLoading: Boolean(uid) && isLoading };
}
