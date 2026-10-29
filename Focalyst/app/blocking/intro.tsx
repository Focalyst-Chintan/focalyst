import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { cardShadow, type, useBlockingTheme } from '../../constants/blockingTheme';
import { useBlocking } from '../../src/blocking/BlockingContext';
import { exitToFocus } from '../../src/blocking/setupNav';
import { SetupScreen } from '../../components/blocking/SetupScreen';
import { CircleIconButton, PrimaryButton, TextButton } from '../../components/blocking/Buttons';
import { ProgressRing, RING_SIZES } from '../../components/blocking/ProgressRing';
import { GroupDivider } from '../../components/blocking/Form';

const STEPS = [
  'Choose the apps that pull you away',
  'Pick how strict blocking should be',
  "Press Start on your Pomodoro. That's it.",
];

/** S2. */
export default function BlockingIntro() {
  const { c, isDark } = useBlockingTheme();
  const router = useRouter();
  const { beginSetup, permissionStatus } = useBlocking();
  const pill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    beginSetup();
    Animated.timing(pill, { toValue: 1, duration: 250, delay: 550, useNativeDriver: true }).start();
  }, [beginSetup, pill]);

  const start = () => {
    // The step count is fixed here so it stays the same for the whole flow.
    if (permissionStatus === 'approved') router.push('/blocking/apps?n=3');
    else router.push('/blocking/permission?n=4');
  };

  return (
    <SetupScreen
      header={
        <View style={styles.topRow}>
          <CircleIconButton icon="close" onPress={() => exitToFocus(router)} accessibilityLabel="Close" />
        </View>
      }
      footer={
        <>
          <PrimaryButton label="Set up blocking" onPress={start} />
          <TextButton label="Not now" onPress={() => exitToFocus(router)} />
        </>
      }
    >
      <View style={styles.hero}>
        <ProgressRing {...RING_SIZES.intro} progress={0.7} animateIn>
          <Text style={[styles.heroTime, { color: c.textPrimary }]}>25:00</Text>
        </ProgressRing>
        <Animated.View style={[styles.pill, { backgroundColor: c.accentTint, opacity: pill }]}>
          <Ionicons name="lock-closed-outline" size={14} color={c.accent} />
          <Text style={[styles.pillLabel, { color: c.accent }]}>Apps locked</Text>
        </Animated.View>
      </View>

      <Text style={[type.setupTitle, styles.center, { color: c.textPrimary, marginTop: 32 }]}>
        Protect your focus automatically
      </Text>
      <Text style={[type.body, styles.center, styles.subtitle, { color: c.textSecondary }]}>
        When a focus block starts, your distracting apps lock. When your break starts, they open again.
      </Text>

      <View style={[styles.card, cardShadow(isDark), { backgroundColor: c.surface, borderColor: c.border }]}>
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            {i > 0 && <GroupDivider />}
            <View style={styles.stepRow}>
              <View style={[styles.number, { backgroundColor: c.iconCircle }]}>
                <Text style={[styles.numberLabel, { color: c.accent }]}>{i + 1}</Text>
              </View>
              <Text style={[type.bodyStrong, { color: c.textPrimary, flex: 1 }]}>{label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </SetupScreen>
  );
}

const styles = StyleSheet.create({
  topRow: { height: 56, justifyContent: 'center' },
  hero: { alignItems: 'center', marginTop: 40, gap: 12 },
  heroTime: { fontSize: 32, lineHeight: 38, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pill: { height: 28, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillLabel: { fontSize: 13, lineHeight: 16, fontWeight: '600' },
  center: { textAlign: 'center' },
  subtitle: { marginTop: 8, maxWidth: 320, alignSelf: 'center' },
  card: { marginTop: 32, borderRadius: 24, borderWidth: 1, paddingVertical: 4 },
  stepRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 8 },
  number: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numberLabel: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
});
