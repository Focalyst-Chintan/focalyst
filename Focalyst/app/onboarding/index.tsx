import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useUser } from '../../src/utils/UserContext';
import {
  emptyDraft,
  loadDraft,
  saveDraft,
  type OnboardingAnswers,
  type OnboardingDraft,
} from '../../src/onboarding/draft';
import {
  SIGNED_IN_START,
  chapterOf,
  isStepId,
  next,
  normalize,
  prev,
  progressWithinChapter,
  type StepContext,
} from '../../src/onboarding/steps';
import { OnboardingScreen } from '../../src/onboarding/screens';
import { OnboardingTopBar, StepTransition } from '../../src/onboarding/ui/Shell';
import { AmbientBackground } from '../../src/onboarding/ui/primitives';
import { useOnboardingTheme } from '../../src/onboarding/ui/theme';

// The whole onboarding journey: one screen with an internal step machine that
// resumes from the draft (IOS_ONBOARDING_DESIGN.md sections 2 and 9).
export default function OnboardingFlow() {
  const router = useRouter();
  const t = useOnboardingTheme();
  const { profile } = useUser();
  const params = useLocalSearchParams<{ signedIn?: string }>();
  const signedIn = params.signedIn === '1';

  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [greet, setGreet] = useState(false);
  // Auto-advancing choices call goNext 250 ms after their update, so the
  // machine reads the latest draft from a ref rather than a render closure.
  const draftRef = useRef<OnboardingDraft | null>(null);

  const ctxOf = useCallback((d: OnboardingDraft): StepContext => ({ answers: d.answers, signedIn }), [signedIn]);

  const commit = useCallback((change: (d: OnboardingDraft) => OnboardingDraft) => {
    if (!draftRef.current) return;
    const nextDraft = change(draftRef.current);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    saveDraft(nextDraft);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadDraft();
      if (cancelled) return;
      const start = signedIn ? SIGNED_IN_START : 1;
      const base = saved ?? emptyDraft(start);
      const step = normalize(isStepId(base.step) ? base.step : start, { answers: base.answers, signedIn });
      const initial = { ...base, step };
      draftRef.current = initial;
      setDraft(initial);
      saveDraft(initial);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const update = useCallback(
    (patch: Partial<OnboardingAnswers>) => commit((d) => ({ ...d, answers: { ...d.answers, ...patch } })),
    [commit],
  );

  const goNext = useCallback(() => {
    commit((d) => {
      const target = next(d.step, ctxOf(d));
      if (!target) return d;
      setGreet(d.step === 5);
      return { ...d, step: target };
    });
    setDirection(1);
  }, [commit, ctxOf]);

  const goBack = useCallback(() => {
    const current = draftRef.current;
    const target = current ? prev(current.step, ctxOf(current)) : null;
    if (!target) return false;
    setGreet(false);
    setDirection(-1);
    commit((d) => ({ ...d, step: target }));
    return true;
  }, [commit, ctxOf]);

  // Android: the back button goes back one step.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => sub.remove();
  }, [goBack]);

  // "I already have an account": the existing sign-in screen, unchanged.
  const openSignIn = useCallback(() => router.push('/auth' as any), [router]);

  // Prefill the name from an existing account, but never use an email as a name.
  const fullName = profile?.full_name?.trim();
  const suggestedName = fullName && !fullName.includes('@') ? fullName.split(/\s+/)[0] : undefined;

  if (!draft) {
    return (
      <View style={[styles.loading, { backgroundColor: t.canvas }]}>
        <ActivityIndicator color={t.primaryText} />
      </View>
    );
  }

  const ctx = ctxOf(draft);
  const canGoBack = prev(draft.step, ctx) !== null;

  return (
    <View style={[styles.root, { backgroundColor: t.canvas }]}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <AmbientBackground strong={draft.step === 1} />
      <OnboardingTopBar
        chapter={chapterOf(draft.step)}
        chapterProgress={progressWithinChapter(draft.step, ctx)}
        onBack={canGoBack ? goBack : null}
      />
      <StepTransition key={draft.step} direction={direction}>
        <OnboardingScreen
          step={draft.step}
          answers={draft.answers}
          update={update}
          goNext={goNext}
          greet={greet}
          suggestedName={suggestedName}
          openSignIn={openSignIn}
        />
      </StepTransition>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
