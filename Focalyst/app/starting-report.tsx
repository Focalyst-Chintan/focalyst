import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useUser } from '../src/utils/UserContext';
import { fetchOnboardingProfile, type OnboardingProfileRow } from '../src/onboarding/onboardingProfile';
import { buildStartingReport } from '../src/onboarding/startingReport';
import { StartingReportView } from '../src/onboarding/ui/StartingReportView';
import { AmbientBackground } from '../src/onboarding/ui/primitives';
import { GUTTER, useOnboardingTheme } from '../src/onboarding/ui/theme';

// The starting report page, opened from the Insights card (7.6). Same component as screen 28.
export default function StartingReportPage() {
  const router = useRouter();
  const t = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile } = useUser();
  const [row, setRow] = useState<OnboardingProfileRow | null | undefined>(undefined);
  const paywallOpen = useRef(false);
  const isPro = !!profile?.isPro;

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      fetchOnboardingProfile(user.id).then(setRow);
      // Back from the paywall: re-check Pro so a purchase unlocks the report straight away.
      if (paywallOpen.current) {
        paywallOpen.current = false;
        refreshProfile().catch(() => null);
      }
    }, [refreshProfile, user?.id]),
  );

  const report = useMemo(
    () =>
      row
        ? buildStartingReport({ answers: row.answers, report: row.report, isPro, today: new Date(row.completed_at) })
        : null,
    [isPro, row],
  );

  return (
    <View style={[styles.root, { backgroundColor: t.canvas }]}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <AmbientBackground />
      <View style={[styles.topBar, { marginTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.back,
            { backgroundColor: t.surface, borderColor: t.surfaceBorder, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ChevronLeft size={22} color={t.ink} />
        </Pressable>
      </View>
      {report ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <StartingReportView
            report={report}
            isPro={isPro}
            onUnlock={() => {
              paywallOpen.current = true;
              router.push('/paywall');
            }}
          />
        </ScrollView>
      ) : (
        <View style={styles.center}>
          {row === null ? (
            <Text style={[styles.empty, { color: t.ink2 }]}>Your starting report isn't available yet.</Text>
          ) : (
            <ActivityIndicator color={t.primaryText} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { height: 52, justifyContent: 'center', paddingHorizontal: GUTTER - 4 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: GUTTER, paddingTop: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: GUTTER },
  empty: { fontSize: 16, textAlign: 'center' },
});
