'use client';
// /onboarding/finish (WEB_ONBOARDING_DESIGN.md 8.3 and 8.5): saves the plan, runs the group step, then returns to /start.
import { useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { hasPro } from '@/lib/billing/proStatus';
import { GlobalToastContainer, useToast } from '@/components/desktop/ui/Toast';
import {
  clearDraft, clearPendingFinish, firstName, readDraft, setPendingFinish, setPostCookie, writeDraft, writePendingCountdown,
  writePostState, type OnboardingPostState,
} from '@/lib/onboarding/draft';
import { groupHabitId, runGroupStep } from '@/lib/onboarding/groupStep';
import { buildOnboardingPayload } from '@/lib/onboarding/payload';
import { buildPlan, saveRecommendedPreset } from '@/lib/onboarding/plan';
import { hasStoreLinkEnv } from '@/lib/onboarding/steps';
import { OnboardingStage, StepFrame } from '@/components/onboarding/OnboardingStage';

/** complete_onboarding: one call, then retries after 1 s, 3 s and 6 s. */
const ATTEMPT_DELAYS = [0, 1000, 3000, 6000];
const WELCOME_BACK_MS = 1600;

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function homePath() {
  // Desktop /today; phones keep their current home (as the login page does).
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches ? '/today' : '/plan';
}

interface FinishResult {
  habit_ids?: string[];
  countdown_pending?: boolean;
}

export default function FinishFlow() {
  const router = useRouter();
  const { refreshUserProfile } = useAuth();
  const toast = useToast();
  const titleId = useId();
  const started = useRef(false);
  const refreshRef = useRef(refreshUserProfile);
  useEffect(() => { refreshRef.current = refreshUserProfile; });

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        router.replace('/login?mode=save-plan&next=%2Fonboarding%2Ffinish');
        return;
      }

      // 2. Check the account.
      const { data: row } = await supabase
        .from('users')
        .select('onboarding_done, full_name, plan, plan_expires_at')
        .eq('id', user.id)
        .single();
      const draft = readDraft();

      if (row?.onboarding_done) {
        // An existing account logged in at 27: its plan is kept and the function isn't called.
        clearDraft();
        if (draft) {
          toast.show('Welcome back. Your existing plan is kept.', 'success');
          await wait(WELCOME_BACK_MS);
        }
        router.replace(homePath());
        return;
      }
      if (!draft) {
        // Not onboarded and no draft: /start begins at screen 4 for signed-in users.
        router.replace('/start');
        return;
      }

      const pro = hasPro(row);
      const payload = buildOnboardingPayload(draft, { hasFullName: Boolean(row?.full_name?.trim()) });

      // 3. Call complete_onboarding, retrying 3 times. The function never creates duplicates.
      let result: FinishResult | null = null;
      for (const delay of ATTEMPT_DELAYS) {
        if (delay) await wait(delay);
        try {
          const { data, error } = await supabase.rpc('complete_onboarding', { p: payload });
          if (!error) {
            result = (data ?? {}) as FinishResult;
            break;
          }
        } catch { /* retry */ }
      }

      if (!result) {
        // Keep the draft, retry on a later app visit, and carry on to the next screens anyway.
        setPendingFinish();
        writeDraft({ ...draft, step: 28 });
        router.replace('/start');
        return;
      }

      // 4. Success.
      const answers = draft.answers;
      const plan = buildPlan(answers, pro);
      saveRecommendedPreset(plan);
      const g = answers.group;
      const habits = answers.habits ?? [];
      const post: Omit<OnboardingPostState, 'savedAt'> = {
        step: 28,
        name: firstName(answers.name) || firstName(row?.full_name),
        preset: plan.presetLabel,
        habitName: habits[g?.habit_index === 1 ? 1 : 0]?.name ?? habits[0]?.name ?? null,
        group: null,
        countdownPending: Boolean(result.countdown_pending),
        checkoutPending: null,
        answers,
        skipped: draft.skipped,
        plan,
        report: draft.report,
        groupHabitId: groupHabitId(g, Array.isArray(result.habit_ids) ? result.habit_ids : []),
      };
      clearDraft();
      clearPendingFinish();
      writePostState(post);
      if (result.countdown_pending && answers.countdown) {
        writePendingCountdown({ name: answers.countdown.name, date: answers.countdown.date, status: 'pending' });
      }
      try { await refreshRef.current(); } catch { /* the context refreshes on its own later */ }

      const group = await runGroupStep(g, Array.isArray(result.habit_ids) ? result.habit_ids : []);
      // 28 is the starting report for everyone (REPORT R1).
      const step = 28;
      writePostState({ ...post, step, group });
      setPostCookie();
      router.replace('/start');
    })();
  }, [router, toast]);

  return (
    <>
      <GlobalToastContainer />
      <OnboardingStage
        step={27}
        flow={{ answers: {}, signedIn: true, isPro: false, native: false, hasStoreLink: hasStoreLinkEnv() }}
        wide
        showBack={false}
        onBack={() => {}}
        planPanel={null}
      >
        <StepFrame
          wide
          titleId={titleId}
          title="Saving your plan…"
          primary={null}
          showBack={false}
          onBack={() => {}}
          direction="fwd"
          body={
            <div role="status" aria-labelledby={titleId} className="flex items-center gap-3 text-[15px] text-ink-2">
              <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-[3px] border-surface-3 border-t-primary" />
            </div>
          }
        />
      </OnboardingStage>
    </>
  );
}
