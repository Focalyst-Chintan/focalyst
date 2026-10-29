'use client';
// The /start journey: loads the draft, resumes at the saved step and renders it.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPro } from '@/lib/billing/proStatus';
import { isNativeApp } from '@/lib/billing/checkout';
import {
  emptyDraft, firstName, readDraft, writeDraft, type AnswerKey, type OnboardingAnswers, type OnboardingDraft,
} from '@/lib/onboarding/draft';
import type { OnboardingPlan } from '@/lib/onboarding/plan';
import type { ReportSnapshot } from '@/lib/onboarding/report';
import {
  NO_BACK_STEPS, WIDE_STEPS, hasStoreLinkEnv, isVisible, next, prev, type FlowState,
} from '@/lib/onboarding/steps';
import { OnboardingStage, PlanPanelScroll } from '@/components/onboarding/OnboardingStage';
import { PlanPreview } from '@/components/onboarding/PlanPreview';
import { StepScreen, type ScreenCtx } from '@/components/onboarding/screens';
import { AppPreview, Collage } from '@/components/onboarding/visuals';

const GREETING_MS = 900;

export default function StartFlow({ collageImages }: { collageImages: boolean[] }) {
  const { user, isLoading, plan } = useAuth();
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
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
    if (saved) {
      // A saved step that can't be shown (for example 21 on the web) moves to the next visible one.
      const f: FlowState = { answers: saved.answers, signedIn: Boolean(user), isPro: false, native: isNativeApp(), hasStoreLink: hasStoreLinkEnv() };
      const s = isVisible(saved.step, f) ? saved.step : next(saved.step, f) ?? prev(saved.step, f) ?? 1;
      setDraft({ ...saved, step: s });
      return;
    }
    if (!isLoading) setDraft(emptyDraft(user ? 4 : 1));
  }, [isLoading, user]);

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

  const goBack = useCallback((from: number) => {
    setDirection('back');
    setDraft((d) => {
      if (!d || d.step !== from) return d;
      const p = prev(d.step, flowOf(d.answers));
      return p ? { ...d, step: p } : d;
    });
  }, [flowOf]);

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
  };

  const planPanel =
    step === 1 ? (
      <div className="relative min-h-0 w-full flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
        <Collage columns={2} images={collageImages} />
      </div>
    ) : step === 2 ? (
      <AppPreview className="m-auto max-w-[440px]" />
    ) : step === 3 ? (
      <AppPreview dimmed className="m-auto max-w-[440px]" />
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
