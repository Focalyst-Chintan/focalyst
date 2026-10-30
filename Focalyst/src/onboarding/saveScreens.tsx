import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import type { ScreenProps } from './screens';
import { buildStartingReport } from './startingReport';
import { computeOnboardingReport } from './report';
import { StepLayout } from './ui/Shell';
import { GhostButton, PrimaryButton } from './ui/primitives';
import { Statement } from './ui/patterns';
import { StartingReportView } from './ui/StartingReportView';
import { haptics } from './ui/haptics';
import { useUser } from '../utils/UserContext';
import { supabase } from '../utils/supabase';
import { setReportPaywallOpen } from './paywallIntent';

// Chapter 6 · Save and Pro (screens 27 and 28).

/** 27. Shown only if someone comes back from the sign-in screen without signing in. */
function SavePlan({ openSignIn }: ScreenProps) {
  return (
    <StepLayout centered footer={<PrimaryButton label="Save my plan" onPress={openSignIn} />}>
      <Statement title="Save your plan." line="Sign in to keep your plan and your starting report." />
    </StepLayout>
  );
}

/** 28. Your starting report (7.1, 7.3). */
function YourStartingReport({ answers, report, isPro, goNext }: ScreenProps) {
  const router = useRouter();
  const { refreshProfile } = useUser();
  const [unlockedNow, setUnlockedNow] = useState(false);
  const pro = isPro || unlockedNow;
  const paywallOpen = useRef(false);

  const built = useMemo(
    () => buildStartingReport({ answers, report: report ?? computeOnboardingReport(answers), isPro: pro }),
    [answers, pro, report],
  );

  // When the existing paywall closes, re-check Pro with the existing hook.
  useFocusEffect(
    useCallback(() => {
      if (!paywallOpen.current) return;
      paywallOpen.current = false;
      setReportPaywallOpen(false);
      (async () => {
        const profile = await refreshProfile().catch(() => null);
        if (!profile?.isPro) return;
        try {
          await supabase.rpc('claim_pending_countdown');
        } catch (e) {
          console.warn('[Onboarding] claim_pending_countdown failed:', e);
        }
        haptics.success();
        setUnlockedNow(true);
      })();
    }, [refreshProfile]),
  );

  // The same call the app uses everywhere else to open the paywall.
  const unlock = () => {
    paywallOpen.current = true;
    setReportPaywallOpen(true);
    router.push('/paywall');
  };

  return (
    <StepLayout
      footer={
        pro ? (
          <PrimaryButton label="Continue" onPress={goNext} />
        ) : (
          <>
            <GhostButton label="Maybe later" onPress={goNext} />
            <PrimaryButton label="Unlock my full report" onPress={unlock} />
          </>
        )
      }
    >
      <StartingReportView report={built} isPro={pro} onUnlock={pro ? undefined : unlock} />
    </StepLayout>
  );
}

export const SAVE_SCREENS = {
  27: SavePlan,
  28: YourStartingReport,
} as const;
