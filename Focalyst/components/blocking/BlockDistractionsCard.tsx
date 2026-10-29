import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { type, useBlockingTheme, useReduceMotion } from '../../constants/blockingTheme';
import { formatClock, selectionLabel } from '../../src/blocking/levels';
import { useBlocking } from '../../src/blocking/BlockingContext';
import { haptics } from '../../src/blocking/haptics';
import { AppIconStrip } from './AppIcon';
import { LevelChip } from './Chips';
import { Dialog } from './Overlays';
import { StrictnessSheet } from './StrictnessSheet';
import { QuickBlockSheet } from './QuickBlockSheet';
import { UnlockBanner } from './UnlockBanner';
import { FreeAppLimitBanner } from './FreeAppLimitBanner';

type CardState = 'A' | 'B' | 'C' | 'D' | 'E';

/** Small pill action: height 32, radius 16, accentTint fill, 13/600 accent label. */
function PillButton({
  label,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { c } = useBlockingTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: disabled ? c.surface2 : danger ? c.dangerTint : c.accentTint,
          borderColor: disabled ? c.border : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.pillLabel, { color: disabled ? c.textSecondary : danger ? c.danger : c.accent }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * S1. Sits where the old placeholder card was and reuses that card's container style so it
 * matches its siblings on the Focus tab.
 */
export function BlockDistractionsCard({ containerStyle }: { containerStyle?: StyleProp<ViewStyle> }) {
  const { c, isDark } = useBlockingTheme();
  const reduceMotion = useReduceMotion();
  const router = useRouter();
  const {
    ready,
    supported,
    config,
    permissionStatus,
    session,
    shield,
    quickBlock,
    unlockWindow,
    overFreeAppLimit,
    setEnabled,
    stopQuickBlock,
  } = useBlocking();
  const [strictnessOpen, setStrictnessOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  // A quick block or schedule holding apps while no Pomodoro runs.
  const standalone = !session && shield.active;
  const scheduleSource = shield.sources.find((s) => s.kind === 'schedule');

  const state: CardState = !config.setupCompletedAt
    ? 'A'
    : ready && permissionStatus !== 'approved'
      ? 'D'
      : standalone
        ? 'E'
        : config.enabled
          ? 'B'
          : 'C';

  const subtitle = {
    A: 'Lock distracting apps while you focus',
    B: 'On · apps lock when focus starts',
    C: 'Off · apps stay open during focus',
    D: 'Permission is off. Tap to fix',
    E: quickBlock
      ? `Quick block · until ${formatClock(shield.endAt)}`
      : `${scheduleSource?.label ?? 'Schedule'} · until ${formatClock(shield.endAt)}`,
  }[state];

  const openSetup = () => {
    if (!supported) {
      // Android and builds without the native module keep today's behavior.
      Alert.alert('Upcoming Feature', 'Block distractions will be available in a future update.');
      return;
    }
    router.push('/blocking/intro');
  };

  const onCardPress = () => {
    if (state === 'A') return openSetup();
    if (state === 'D') return router.push('/blocking/permission?mode=fix');
  };

  const stopLevel = quickBlock?.level ?? 'gentle';
  const requestStop = () => {
    if (stopLevel === 'firm') return setConfirmStop(true);
    haptics.light();
    stopQuickBlock();
  };

  const onToggle = (value: boolean) => {
    if (state === 'A') return openSetup();
    if (state === 'D') return;
    haptics.selection();
    setEnabled(value);
  };

  const toggleOn = state !== 'A' && state !== 'D' && config.enabled;
  const showBottom = state !== 'A';

  // Divider draws in and the row rises once setup completes.
  const reveal = useRef(new Animated.Value(showBottom ? 1 : 0)).current;
  const wasShown = useRef(showBottom);
  useEffect(() => {
    if (showBottom && !wasShown.current) {
      reveal.setValue(0);
      Animated.timing(reveal, { toValue: 1, duration: reduceMotion ? 0 : 400, useNativeDriver: false }).start();
    }
    wasShown.current = showBottom;
  }, [showBottom, reveal, reduceMotion]);

  const subtitleFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    subtitleFade.setValue(0.4);
    Animated.timing(subtitleFade, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [state, subtitleFade]);

  return (
    <View style={containerStyle}>
      <Pressable
        onPress={onCardPress}
        disabled={state !== 'A' && state !== 'D'}
        accessibilityRole="button"
        accessibilityLabel={`Block distractions. ${subtitle}`}
        style={styles.topRow}
      >
        <View style={[styles.iconCircle, { backgroundColor: c.iconCircle }]}>
          <Ionicons name="shield-half-outline" size={20} color={c.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.cardTitle, { color: c.textPrimary }]}>Block distractions</Text>
          <Animated.Text
            numberOfLines={2}
            style={[type.secondary, type.tabular, { color: state === 'D' ? c.danger : c.textSecondary, opacity: subtitleFade }]}
          >
            {subtitle}
          </Animated.Text>
        </View>
        <Switch
          value={toggleOn}
          onValueChange={onToggle}
          disabled={state === 'D'}
          trackColor={{ false: isDark ? '#222D47' : '#cbd5e1', true: c.accent }}
          thumbColor={toggleOn ? '#FFFFFF' : isDark ? '#8E95A9' : '#f1f5f9'}
          accessibilityLabel="Auto-block when Pomodoro starts"
        />
      </Pressable>

      {showBottom && (
        <Animated.View style={{ opacity: Animated.multiply(reveal, state === 'D' ? 0.6 : 1) }}>
          <Animated.View
            style={[
              styles.divider,
              {
                backgroundColor: c.border,
                width: reveal.interpolate({ inputRange: [0, 0.6, 1], outputRange: ['0%', '100%', '100%'] }),
              },
            ]}
          />
          <Animated.View
            style={{ transform: [{ translateY: reveal.interpolate({ inputRange: [0, 0.6, 1], outputRange: [8, 8, 0] }) }] }}
          >
            {state === 'E' && unlockWindow && (
              <View style={{ marginBottom: 12 }}>
                <UnlockBanner />
              </View>
            )}

            <View style={styles.bottomRow}>
              <View style={styles.appsCluster}>
                <AppIconStrip
                  count={config.blocklistSummary.appCount}
                  locked={state === 'E' && !unlockWindow}
                  ringColor={c.surface}
                />
                <Text style={styles.appsLabel(c.textSecondary)}>{selectionLabel(config.blocklistSummary)}</Text>
              </View>
              <LevelChip
                level={state === 'E' ? shield.level : config.level}
                onPress={state === 'E' ? undefined : () => setStrictnessOpen(true)}
              />
            </View>

            {overFreeAppLimit && (
              <View style={{ marginTop: 12 }}>
                <FreeAppLimitBanner />
              </View>
            )}

            <View style={styles.actionsRow}>
              {state === 'E' ? (
                <>
                  {!unlockWindow && <PillButton label="Unlock" onPress={() => router.push('/blocking/unlock')} />}
                  {quickBlock &&
                    (stopLevel === 'locked' ? (
                      <PillButton label={`Locked until ${formatClock(quickBlock.endAt)}`} disabled />
                    ) : (
                      <PillButton label="Stop" onPress={requestStop} danger />
                    ))}
                  {!quickBlock && <ManageLink />}
                </>
              ) : (
                <>
                  <PillButton label="Block now" onPress={() => setQuickOpen(true)} />
                  <ManageLink />
                </>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      )}

      <StrictnessSheet visible={strictnessOpen} onClose={() => setStrictnessOpen(false)} />
      <QuickBlockSheet visible={quickOpen} onClose={() => setQuickOpen(false)} />
      <Dialog
        visible={confirmStop}
        title="End this quick block early?"
        body="Your apps unlock now."
        primary={{ label: 'Keep going', onPress: () => setConfirmStop(false) }}
        secondary={{
          label: 'End quick block',
          danger: true,
          onPress: () => {
            setConfirmStop(false);
            stopQuickBlock();
          },
        }}
        onClose={() => setConfirmStop(false)}
      />
    </View>
  );
}

function ManageLink() {
  const { c } = useBlockingTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/blocking/rules?mode=manage')}
      accessibilityRole="button"
      hitSlop={4}
      style={({ pressed }) => [styles.manage, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.manageLabel, { color: c.accent }]}>Manage</Text>
      <Ionicons name="chevron-forward" size={16} color={c.accent} />
    </Pressable>
  );
}

const styles = {
  ...StyleSheet.create({
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    divider: { height: 1, marginVertical: 16 },
    bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    appsCluster: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
    pill: { height: 32, borderRadius: 16, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1 },
    pillLabel: { fontSize: 13, lineHeight: 16, fontWeight: '600' },
    manage: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
    manageLabel: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  }),
  appsLabel: (color: string) => ({ fontSize: 14, lineHeight: 20, fontWeight: '500' as const, color, flexShrink: 1 }),
};
