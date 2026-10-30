import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useUser } from '../../src/utils/UserContext';
import {
  emptyDraft,
  loadDraft,
  loadPostState,
  saveDraft,
  savePostState,
  type OnboardingAnswers,
  type OnboardingDraft,
  type OnboardingPostState,
  type OnboardingReport,
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

/** The first screen that only exists after the plan is saved. */
const SAVED_FROM = 28;

// The whole onboarding journey: one screen with an internal step machine that
// resumes from the draft, or from the post state once the plan is saved
// (IOS_ONBOARDING_DESIGN.md sections 2 and 9).
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
  // Set once the plan is saved: screens 28 to 32 persist to onboarding:post:v1.
  const postRef = useRef<OnboardingPostState | null>(null);

  const ctxOf = useCallback(
    (d: OnboardingDraft): StepContext => ({
      answers: d.answers,
      signedIn,
      hasGroupResult: postRef.current ? postRef.current.group !== null : undefined,
    }),
    [signedIn],
  );

  const persist = useCallback((d: OnboardingDraft) => {
    if (postRef.current) {
      postRef.current = { ...postRef.current, step: d.step, answers: d.answers, report: d.report ?? postRef.current.report };
      savePostState(postRef.current);
    } else {
      saveDraft(d);
    }
  }, []);

  const commit = useCallback(
    (change: (d: OnboardingDraft) => OnboardingDraft) => {
      if (!draftRef.current) return;
      const nextDraft = change(draftRef.current);
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      persist(nextDraft);
    },
    [persist],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const post = signedIn ? await loadPostState() : null;
      if (cancelled) return;
      if (post) {
        postRef.current = post;
        const step = isStepId(post.step) && post.step >= SAVED_FROM ? post.step : SAVED_FROM;
        const initial: OnboardingDraft = {
          step,
          answers: post.answers,
          report: post.report,
          countedUp: [],
          updatedAt: post.savedAt,
        };
        draftRef.current = initial;
        setDraft(initial);
        return;
      }

      const saved = await loadDraft();
      if (cancelled) return;
      // Signed in with a plan waiting to be saved: finish it.
      if (signedIn && saved && saved.step >= 27) {
        router.replace('/onboarding/finish' as any);
        return;
      }
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
  }, [router, signedIn]);

  const update = useCallback(
    (patch: Partial<OnboardingAnswers>) => commit((d) => ({ ...d, answers: { ...d.answers, ...patch } })),
    [commit],
  );

  // "Save my plan": the existing sign-in screen, unchanged. Signed-in users go straight to finish.
  const openSignIn = useCallback(() => router.push('/auth' as any), [router]);

  const goNext = useCallback(() => {
    const current = draftRef.current;
    if (!current) return;
    const target = next(current.step, ctxOf(current));
    if (!target) return;
    if (!postRef.current && target >= SAVED_FROM) {
      router.replace('/onboarding/finish' as any);
      return;
    }
    setGreet(current.step === 5);
    setDirection(1);
    commit((d) => ({ ...d, step: target }));
    if (target === 27) openSignIn();
  }, [commit, ctxOf, openSignIn, router]);

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

  const setReport = useCallback((report: OnboardingReport) => commit((d) => ({ ...d, report })), [commit]);

  const [, setPostVersion] = useState(0);
  const updatePost = useCallback((patch: Partial<OnboardingPostState>) => {
    if (!postRef.current) return;
    postRef.current = { ...postRef.current, ...patch };
    savePostState(postRef.current);
    setPostVersion((v) => v + 1);
  }, []);

  const markCountedUp = useCallback(
    (key: string) => commit((d) => (d.countedUp.includes(key) ? d : { ...d, countedUp: [...d.countedUp, key] })),
    [commit],
  );

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
          isPro={signedIn && !!profile?.isPro}
          report={draft.report}
          setReport={setReport}
          countedUp={draft.countedUp}
          markCountedUp={markCountedUp}
          post={postRef.current}
          updatePost={updatePost}
        />
      </StepTransition>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
