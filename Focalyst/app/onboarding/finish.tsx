import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../src/utils/UserContext';
import { useBlocking } from '../../src/blocking/BlockingContext';
import { runFinish } from '../../src/onboarding/finish';
import { AmbientBackground } from '../../src/onboarding/ui/primitives';
import { LoaderChecklist } from '../../src/onboarding/ui/patterns2';
import { Statement } from '../../src/onboarding/ui/patterns';
import { GUTTER, useOnboardingTheme } from '../../src/onboarding/ui/theme';

// /onboarding/finish (IOS_ONBOARDING_DESIGN.md section 8.2): saves the plan, then shows screen 28.
export default function OnboardingFinish() {
  const router = useRouter();
  const t = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const { refreshProfile } = useUser();
  // The app-wide snackbar lives in the blocking provider.
  const { showSnackbar } = useBlocking();

  useEffect(() => {
    let cancelled = false;
    runFinish(refreshProfile).then((outcome) => {
      if (cancelled) return;
      switch (outcome.kind) {
        case 'welcome_back':
          showSnackbar('Welcome back. Your existing plan is kept.');
          router.replace('/(tabs)/plan' as any);
          return;
        case 'saved':
        case 'pending':
          router.replace({ pathname: '/onboarding', params: { signedIn: '1' } } as any);
          return;
        case 'no_session':
          router.replace('/onboarding' as any);
          return;
        case 'no_draft':
          router.replace('/(tabs)/plan' as any);
      }
    });
    return () => {
      cancelled = true;
    };
    // Runs once per mount; runFinish shares one run between mounts.
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: t.canvas, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <AmbientBackground />
      <Statement title="Saving your plan…" />
      <View style={{ height: 32 }} />
      <LoaderChecklist
        lines={['Saving your answers', 'Creating your habits and tasks', 'Setting up your countdown', 'Preparing your report']}
        stepMs={900}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: GUTTER, justifyContent: 'center' },
});
