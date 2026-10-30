'use client';
// The /start journey: loads the draft, resumes at the saved step and renders it.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { hasPro } from '@/lib/billing/proStatus';
import { isNativeApp } from '@/lib/billing/checkout';
import {
  clearPostState, emptyDraft, firstName, hasPendingFinish, readDraft, readPostState, writeDraft, writePostState,
  type AnswerKey, type OnboardingAnswers, type OnboardingDraft, type OnboardingPostState,
} from '@/lib/onboarding/draft';
import type { OnboardingPlan } from '@/lib/onboarding/plan';
import type { ReportSnapshot } from '@/lib/onboarding/report';
import {
  NO_BACK_STEPS, WIDE_STEPS, hasStoreLinkEnv, isVisible, next, prev, type FlowState,
} from '@/lib/onboarding/steps';
import { OnboardingStage, PlanPanelScroll } from '@/components/onboarding/OnboardingStage';
import { PlanPreview } from '@/components/onboarding/PlanPreview';
import { StepScreen, type ScreenCtx } from '@/components/onboarding/screens';
import { Collage } from '@/components/onboarding/visuals';
import { FeaturePills } from '@/components/onboarding/FeaturePills';
import { PostScreens } from '@/components/onboarding/postScreens';

/** Screen 27: the login page in save-plan mode, which returns to /onboarding/finish. */
export const SAVE_PLAN_URL = '/login?mode=save-plan&next=%2Fonboarding%2Ffinish';

const GREETING_MS = 900;
const FINISH_RETRY_KEY = 'onboarding:finishRetried';

function postFromDraft(d: OnboardingDraft): OnboardingPostState {
  const habits = d.answers.habits ?? [];
  return {
    step: d.step,
    name: firstName(d.answers.name),
    preset: d.plan?.presetLabel ?? null,
    habitName: habits[d.answers.group?.habit_index === 1 ? 1 : 0]?.name ?? habits[0]?.name ?? null,
    group: null,
    countdownPending: false,
    checkoutPending: null,
    savedAt: d.updatedAt,
    answers: d.answers,
    skipped: d.skipped,
    plan: d.plan,
  };
}

export default function StartFlow({ collageImages }: { collageImages: boolean[] }) {
  const router = useRouter();
  const { user, isLoading, plan } = useAuth();
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  // After the save (screens 28 to 32) the draft is gone and this small state drives the flow (2.3).
  const [post, setPost] = useState<OnboardingPostState | null>(null);
  // complete_onboarding kept failing (8.3): the draft stays for the retry and 28 to 32 run from it in memory.
  const [memPost, setMemPost] = useState<OnboardingPostState | null>(null);
  const [native, setNative] = useState(false);
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');
  const [notice, setNotice] = useState<{ step: number; text: string } | null>(null);
  const draftRef = useRef<OnboardingDraft | null>(null);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  const signedIn = Boolean(user);
  const isPro = signedIn && hasPro({ plan });

  const flowOf = useCallback(
    (answers: OnboardingAnswers): FlowState => ({ answers, signedIn, isPro, native, hasStoreLink: hasStoreLinkEnv() }),
    [signedIn, isPro, native]
  );

  // Load: a saved draft resumes at once; otherwise wait for auth to pick screen 1 or 4.
  useEffect(() => {
    if (draftRef.current) return;
    setNative(isNativeApp());
    const saved = readDraft();
    const savedPost = saved ? null : readPostState();
    if (savedPost) {
      setPost(savedPost);
      return;
    }
    if (saved) {
      // A saved step that can't be shown (for example 21 on the web) moves to the next visible one.
      const f: FlowState = { answers: saved.answers, signedIn: Boolean(user), isPro: false, native: isNativeApp(), hasStoreLink: hasStoreLinkEnv() };
      const s = isVisible(saved.step, f) ? saved.step : next(saved.step, f) ?? prev(saved.step, f) ?? 1;
      setDraft({ ...saved, step: s });
      return;
    }
    if (!isLoading) setDraft(emptyDraft(user ? 4 : 1));
  }, [isLoading, user]);

  // The save failed earlier (8.3): not-onboarded accounts now always land here, so retry it once per tab session.
  useEffect(() => {
    if (!user || !draft || draft.step < 28 || !hasPendingFinish()) return;
    let first = false;
    try {
      first = window.sessionStorage.getItem(FINISH_RETRY_KEY) !== '1';
      if (first) window.sessionStorage.setItem(FINISH_RETRY_KEY, '1');
    } catch { /* storage blocked: the buttons on 32 still retry */ }
    if (first) router.replace('/onboarding/finish');
  }, [user, draft, router]);

  // Save on every change, so a refresh resumes on the same screen with the same answers.
  useEffect(() => { if (draft) writeDraft(draft); }, [draft]);

  const step = draft?.step ?? 1;

  useEffect(() => {
    try { window.scrollTo({ top: 0 }); } catch { /* ignore */ }
  }, [step]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), GREETING_MS);
    return () => window.clearTimeout(t);
  }, [notice]);

  const set = useCallback(<K extends AnswerKey>(key: K, value: OnboardingAnswers[K]) => {
    setDraft((d) => {
      if (!d) return d;
      const answers: OnboardingAnswers = { ...d.answers, [key]: value };
      let skipped = d.skipped.filter((k) => k !== key);
      // Working towards is for students only; drop it when the role changes.
      if (key === 'profile_type' && value !== 'student') {
        delete answers.life_stage;
        skipped = skipped.filter((k) => k !== 'life_stage');
      }
      return { ...d, answers, skipped };
    });
  }, []);

  const skip = useCallback((key: AnswerKey) => {
    setDraft((d) => {
      if (!d) return d;
      const answers = { ...d.answers };
      delete answers[key];
      return { ...d, answers, skipped: d.skipped.includes(key) ? d.skipped : [...d.skipped, key] };
    });
  }, []);

  const storeReport = useCallback((report: ReportSnapshot, plan: OnboardingPlan) => {
    setDraft((d) => (d ? { ...d, report, plan } : d));
  }, []);

  const markCountedUp = useCallback((s: number) => {
    setDraft((d) => (d && !d.countedUp.includes(s) ? { ...d, countedUp: [...d.countedUp, s] } : d));
  }, []);

  const goNext = useCallback((from: number) => {
    const cur = draftRef.current;
    if (!cur || cur.step !== from) return;
    setDirection('fwd');
    if (from === 5) {
      const name = firstName(cur.answers.name);
      if (name) setNotice({ step: 6, text: `Nice to meet you, ${name}.` });
    }
    setDraft((d) => {
      if (!d || d.step !== from) return d;
      const n = next(d.step, flowOf(d.answers));
      return n ? { ...d, step: n } : d;
    });
  }, [flowOf]);

  // "Save my plan" (25 or 26): signed-in, not-onboarded users skip 27 and save at once.
  const savePlan = useCallback(() => {
    router.push(signedIn ? '/onboarding/finish' : SAVE_PLAN_URL);
  }, [router, signedIn]);

  const goBack = useCallback((from: number) => {
    setDirection('back');
    setDraft((d) => {
      if (!d || d.step !== from) return d;
      const p = prev(d.step, flowOf(d.answers));
      return p ? { ...d, step: p } : d;
    });
  }, [flowOf]);

  const homePath = () => (window.matchMedia('(min-width: 1024px)').matches ? '/today' : '/plan');

  if (!draft && post) {
    return (
      <PostScreens
        post={post}
        isPro={isPro}
        native={native}
        onChange={(patch) => setPost((p) => (p ? writePostState({ ...p, ...patch }) : p))}
        onDone={(to) => {
          clearPostState();
          router.push(to === '/focus' ? '/focus' : homePath());
        }}
      />
    );
  }

  if (draft && draft.step >= 28) {
    const mp = memPost ?? postFromDraft(draft);
    return (
      <PostScreens
        post={mp}
        isPro={isPro}
        native={native}
        onChange={(patch) => {
          setMemPost({ ...mp, ...patch });
          if (patch.step) setDraft((d) => (d ? { ...d, step: patch.step as number } : d));
        }}
        // The account isn't saved yet: leaving retries the save instead of bouncing back here.
        onDone={() => router.push('/onboarding/finish')}
      />
    );
  }

  if (!draft) return <div className="min-h-dvh bg-canvas" aria-busy="true" />;

  const flow = flowOf(draft.answers);
  const showBack = !NO_BACK_STEPS.has(step) && prev(step, flow) !== null;

  const ctx: ScreenCtx = {
    step,
    answers: draft.answers,
    skipped: draft.skipped,
    flow,
    set,
    skip,
    goNext: () => goNext(step),
    goBack: () => goBack(step),
    showBack,
    direction,
    notice: notice?.step === step ? notice.text : null,
    collageImages,
    report: draft.report,
    plan: draft.plan,
    storeReport,
    countedUp: draft.countedUp,
    markCountedUp,
    savePlan,
  };

  const planPanel =
    step === 1 ? (
      <div className="relative min-h-0 w-full flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
        <Collage columns={2} images={collageImages} />
      </div>
    ) : step === 2 ? (
      <FeaturePills onDark className="m-auto max-w-[440px]" />
    ) : step === 3 ? (
      <FeaturePills onDark still className="m-auto max-w-[440px] opacity-50" />
    ) : (
      <PlanPanelScroll>
        <PlanPreview answers={draft.answers} skipped={draft.skipped} isPro={isPro} step={step} className="ob-fade-slow" />
      </PlanPanelScroll>
    );

  return (
    <OnboardingStage
      step={step}
      flow={flow}
      wide={WIDE_STEPS.has(step)}
      showBack={showBack}
      onBack={ctx.goBack}
      planPanel={planPanel}
    >
      <StepScreen key={step} ctx={ctx} />
    </OnboardingStage>
  );
}
