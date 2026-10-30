import React, { useEffect, useRef } from 'react';
import { Animated, DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { cardShadow, type, useBlockingTheme, useReduceMotion } from '../../constants/blockingTheme';
import { useBlocking } from '../../src/blocking/BlockingContext';
import { LEVELS, selectionLabel } from '../../src/blocking/levels';
import { haptics } from '../../src/blocking/haptics';
import { exitToFocus } from '../../src/blocking/setupNav';
import { SetupScreen } from '../../components/blocking/SetupScreen';
import { CircleIconButton, PrimaryButton, SecondaryButton } from '../../components/blocking/Buttons';
import { GroupDivider, SettingsRow } from '../../components/blocking/Form';
import { AppIconStrip } from '../../components/blocking/AppIcon';
import { LevelChip } from '../../components/blocking/Chips';

/** S7. */
export default function BlockingReady() {
  const { c, isDark } = useBlockingTheme();
  const reduceMotion = useReduceMotion();
  const router = useRouter();
  const { config } = useBlocking();
  const pulse = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const rows = useRef([0, 1, 2].map(() => new Animated.Value(reduceMotion ? 1 : 0))).current;

  useEffect(() => {
    haptics.success();
    if (reduceMotion) return;
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.stagger(60, rows.map((r) => Animated.timing(r, { toValue: 1, duration: 250, useNativeDriver: true }))),
    ]).start();
  }, [pulse, rows, reduceMotion]);

  const startSession = () => {
    exitToFocus(router);
    // Let the Focus tab come back on screen before the Pomodoro starts.
    setTimeout(() => DeviceEventEmitter.emit('FOCALYST_POMODORO_START'), 350);
  };

  const meta = LEVELS[config.level];
  const rowStyle = (i: number) => ({
    opacity: rows[i],
    transform: [{ translateY: rows[i].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  });

  return (
    <SetupScreen
      header={
        <View style={styles.topRow}>
          <CircleIconButton icon="close" onPress={() => exitToFocus(router)} accessibilityLabel="Close" />
        </View>
      }
      footer={
        <>
          <PrimaryButton label="Start a focus session" onPress={startSession} />
          <SecondaryButton label="Done" onPress={() => exitToFocus(router)} style={{ marginTop: 4 }} />
        </>
      }
    >
      <View style={styles.hero}>
        <Animated.View
          style={[
            styles.check,
            {
              backgroundColor: c.accentTint,
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.6, 1.06, 1] }) }],
            },
          ]}
        >
          <Ionicons name="checkmark" size={32} color={c.accent} />
        </Animated.View>
        <Text style={[type.setupTitle, { color: c.textPrimary, marginTop: 20, textAlign: 'center' }]}>
          Blocking is ready
        </Text>
        <Text style={[type.body, { color: c.textSecondary, marginTop: 8, textAlign: 'center', maxWidth: 320 }]}>
          Next time you press Start, these apps lock until your break.
        </Text>
      </View>

      <View style={[styles.card, cardShadow(isDark), { backgroundColor: c.surface, borderColor: c.border }]}>
        <Animated.View style={rowStyle(0)}>
          <SettingsRow
            leading={<AppIconStrip count={config.blocklistSummary.appCount} ringColor={c.surface} />}
            title={`${selectionLabel(config.blocklistSummary)} locked`}
            chevron
            onPress={() => router.push('/blocking/apps?mode=edit')}
          />
        </Animated.View>
        <GroupDivider />
        <Animated.View style={rowStyle(1)}>
          <SettingsRow
            leading={<LevelChip level={config.level} />}
            title={meta.facts.join(' · ')}
            chevron
            onPress={() => router.push('/blocking/level?mode=edit')}
          />
        </Animated.View>
        <GroupDivider />
        <Animated.View style={rowStyle(2)}>
          <SettingsRow
            leading={<Ionicons name="cafe-outline" size={20} color={c.accent} />}
            title={config.unblockOnBreaks ? 'Apps open during breaks' : 'Apps stay locked during breaks'}
            chevron
            onPress={() => router.push('/blocking/rules?mode=manage')}
          />
        </Animated.View>
      </View>
    </SetupScreen>
  );
}

const styles = StyleSheet.create({
  topRow: { height: 56, justifyContent: 'center' },
  hero: { alignItems: 'center', marginTop: 24 },
  check: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  card: { marginTop: 32, borderRadius: 24, borderWidth: 1, paddingVertical: 4 },
});
