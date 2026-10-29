'use client';
// Screens 28 to 32 after the save. Placeholders in P3; the real screens come in phase W6.
import { useId } from 'react';
import { firstName, type OnboardingPostState } from '@/lib/onboarding/draft';
import { STEP_NAMES, hasStoreLinkEnv } from '@/lib/onboarding/steps';
import { OnboardingStage, StepFrame } from './OnboardingStage';
import { useOnboardingKeys } from './useOnboardingKeys';

export function postSteps(post: OnboardingPostState, isPro: boolean, native: boolean): number[] {
  return [28, 29, 30, 31, 32].filter((s) => {
    if (s >= 28 && s <= 30) return !isPro && !native;
    if (s === 31) return post.group !== null;
    return true;
  });
}

export function PostScreens({
  post, isPro, native, onStep, onDone,
}: {
  post: OnboardingPostState;
  isPro: boolean;
  native: boolean;
  onStep: (step: number) => void;
  onDone: () => void;
}) {
  const titleId = useId();
  const steps = postSteps(post, isPro, native);
  const step = steps.includes(post.step) ? post.step : steps.find((s) => s > post.step) ?? 32;
  const nextStep = steps.find((s) => s > step);
  const name = firstName(post.name);
  const primary = nextStep
    ? { label: 'Continue', onClick: () => onStep(nextStep) }
    : { label: 'Go to my plan', onClick: onDone };
  useOnboardingKeys({ canContinue: true, onEnter: primary.onClick });

  return (
    <OnboardingStage
      step={step}
      flow={{ answers: {}, signedIn: true, isPro, native, hasStoreLink: hasStoreLinkEnv() }}
      showBack={false}
      onBack={() => {}}
      planPanel={null}
    >
      <StepFrame
        key={step}
        titleId={titleId}
        title={step === 32 ? (name ? `You're all set, ${name}.` : "You're all set.") : STEP_NAMES[step]}
        subtitle={step === 32 ? 'Your plan is ready. The best time to start is now.' : 'Coming soon'}
        primary={primary}
        showBack={false}
        onBack={() => {}}
        direction="fwd"
      />
    </OnboardingStage>
  );
}

export default PostScreens;
