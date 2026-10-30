import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { FileText, Lock } from 'lucide-react-native';
import { useUser } from '../utils/UserContext';
import { fetchOnboardingProfile } from './onboardingProfile';

// Section 7.6: the Insights card, placed at the very end of Insights (below the weekly report).

export function StartingReportCard({ isDark }: { isDark: boolean }) {
  const router = useRouter();
  const { user, profile } = useUser();
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const isPro = !!profile?.isPro;

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let cancelled = false;
      fetchOnboardingProfile(user.id).then((row) => !cancelled && setCompletedAt(row?.completed_at ?? null));
      return () => {
        cancelled = true;
      };
    }, [user?.id]),
  );

  if (!completedAt) return null;

  const ink = isDark ? '#FFFFFF' : '#0A1033';
  const ink2 = isDark ? '#B7C0D8' : '#3D4566';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? '#151B2E' : '#FFFFFF', borderColor: isDark ? '#222A41' : '#E2E8F0' },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.tile, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(3,25,91,0.06)' }]}>
          <FileText size={18} color={isDark ? '#6FA2FF' : '#1951FC'} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: ink }]}>Your starting report</Text>
          <Text style={[styles.line, { color: ink2 }]}>Where you started, and your plan from here.</Text>
        </View>
        {!isPro ? (
          <View style={styles.lock} accessibilityLabel="Some sections are included with Pro">
            <Lock size={14} color={ink2} />
            <View style={[styles.pro, { borderColor: '#3781FC' }]}>
              <Text style={[styles.proText, { color: isDark ? '#6FA2FF' : '#1951FC' }]}>Pro</Text>
            </View>
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Read your starting report"
        onPress={() => router.push('/starting-report' as any)}
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Text style={styles.buttonText}>Read</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  tile: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  line: { fontSize: 14, marginTop: 2 },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pro: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, height: 18, justifyContent: 'center' },
  proText: { fontSize: 11, fontWeight: '700' },
  button: { height: 40, borderRadius: 20, backgroundColor: '#1951FC', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
