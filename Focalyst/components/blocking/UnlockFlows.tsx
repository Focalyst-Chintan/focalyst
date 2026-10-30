import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { cardShadow, type, useBlockingTheme, useReduceMotion } from '../../constants/blockingTheme';
import {
  FIRM_UNLOCKS_PER_SESSION,
  FREE_MAX_UNLOCK_MINUTES,
  GENTLE_UNLOCK_MINUTES,
  useBlocking,
} from '../../src/blocking/BlockingContext';
import { formatClock } from '../../src/blocking/levels';
import { haptics } from '../../src/blocking/haptics';
import { CircleIconButton, PrimaryButton, SecondaryButton, TextButton } from './Buttons';
import { ProgressRing } from './ProgressRing';
import { IconCircle, SelectOption } from './Form';
import { DurationWheel, LongerBreakUpsell } from './DurationWheel';

type Props = { onDone: () => void };

/** Counts down from `seconds` once per second; returns the seconds left. */
function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => {
      const next = Math.max(0, seconds - Math.floor((Date.now() - startedAt) / 1000));
      setLeft(next);
      if (next === 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [seconds]);
  return left;
}

function Pill({ label }: { label: string }) {
  const { c } = useBlockingTheme();
  return (
    <View style={[styles.pill, { backgroundColor: c.surface2, borderColor: c.border }]}>
      <Text style={[styles.pillLabel, type.tabular, { color: c.textPrimary }]}>{label}</Text>
    </View>
  );
}

function TopRow({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <View style={styles.topRow}>
      <CircleIconButton icon="close" onPress={onClose} accessibilityLabel="Back to focus" />
      <Pill label={label} />
      <View style={{ width: 40 }} />
    </View>
  );
}

/** When locked apps open again, for copy like "Your break starts in 18 min". */
function useNextOpening() {
  const { session, shield } = useBlocking();
  const now = Date.now();
  const pomodoroFocus = session && (session.phase === 'focus_locked' || session.phase === 'paused_locked');
  if (pomodoroFocus && !session.keepLockedThroughBreaks && shield.sources.every((s) => s.kind === 'pomodoro')) {
    const mins = Math.max(1, Math.round((session.phaseEndsAt - now) / 60_000));
    return { breakIn: mins, at: session.phaseEndsAt };
  }
  return { breakIn: null as number | null, at: shield.endAt };
}

// ─── S10b Short pause (Gentle) ─────────────────────────────────────────────────

export function ShortPause({ onDone }: Props) {
  const { c } = useBlockingTheme();
  const { grantUnlock, showSnackbar, isPro, unlockTarget } = useBlocking();
  const appName = unlockTarget?.appName ?? null;
  const next = useNextOpening();
  const left = useCountdown(5);
  const [minutes, setMinutes] = useState<number>(GENTLE_UNLOCK_MINUTES);
  const [busy, setBusy] = useState(false);
  const ready = left === 0;
  const needsPro = !isPro && minutes > FREE_MAX_UNLOCK_MINUTES;

  useEffect(() => {
    if (ready) haptics.light();
  }, [ready]);

  const unlock = async () => {
    setBusy(true);
    const result = await grantUnlock(minutes, 'other');
    setBusy(false);
    if (!result.ok) return showSnackbar(result.reason);
    haptics.success();
    onDone();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: c.bg }]}>
      <TopRow label="GENTLE" onClose={onDone} />
      <Animated.ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ProgressRing size={120} stroke={10} progress={left / 5}>
          <Text style={[styles.bigNumber, { color: c.accent }]}>{left}</Text>
        </ProgressRing>
        <Text style={[styles.title, { color: c.textPrimary, marginTop: 20 }]}>Take a breath first</Text>
        <Text style={[type.secondary, styles.centerText, { color: c.textSecondary, marginTop: 8 }]}>
          {appName
            ? `${appName} opens in 5 seconds.${next.breakIn != null ? ` Your break starts in ${next.breakIn} min.` : ''}`
            : 'Your locked apps open in 5 seconds'}
        </Text>
        <Text style={[type.overline, { color: c.textSecondary, marginTop: 20, alignSelf: 'flex-start' }]}>Unlock for</Text>
        <View style={{ marginTop: 8, width: '100%' }}>
          <DurationWheel value={minutes} onChange={setMinutes} isPro={isPro} />
        </View>
        {needsPro && <LongerBreakUpsell onStick={() => setMinutes(FREE_MAX_UNLOCK_MINUTES)} />}
      </Animated.ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          label={appName ? `Open ${appName}` : `Unlock for ${minutes} min`}
          disabled={!ready || needsPro}
          loading={busy}
          onPress={unlock}
          onDisabledPress={() =>
            showSnackbar(needsPro ? 'Longer unlocks need Pro' : `Wait ${left} more ${left === 1 ? 'second' : 'seconds'}`)
          }
        />
        <SecondaryButton label="Back to focus" onPress={onDone} />
      </View>
    </SafeAreaView>
  );
}

// ─── S10 Mindful unlock (Firm) ─────────────────────────────────────────────────

const REASONS = [
  { id: 'study', label: 'Studying or work' },
  { id: 'reply', label: 'Replying to someone' },
  { id: 'bored', label: 'Just bored' },
  { id: 'other', label: 'Something else' },
] as const;

const BREATHE_SECONDS = 15;

export function MindfulUnlock({ onDone }: Props) {
  const { c } = useBlockingTheme();
  const reduceMotion = useReduceMotion();
  const { grantUnlock, unlocksLeft, showSnackbar, isPro, unlockTarget } = useBlocking();
  const appName = unlockTarget?.appName ?? null;
  const left = useCountdown(BREATHE_SECONDS);
  const [reason, setReason] = useState<(typeof REASONS)[number]['id'] | null>(null);
  const [minutes, setMinutes] = useState<number>(3);
  const [busy, setBusy] = useState(false);
  const next = useNextOpening();

  // Breathing disc: 4 s in (0.85 to 1.0), 4 s out.
  const disc = useRef(new Animated.Value(0.85)).current;
  const [inhaling, setInhaling] = useState(true);
  useEffect(() => {
    if (reduceMotion) return;
    let alive = true;
    const cycle = (up: boolean) => {
      if (!alive) return;
      setInhaling(up);
      if (up) haptics.soft();
      Animated.timing(disc, {
        toValue: up ? 1 : 0.85,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => finished && cycle(!up));
    };
    cycle(true);
    return () => {
      alive = false;
      disc.stopAnimation();
    };
  }, [disc, reduceMotion]);

  if (unlocksLeft <= 0) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: c.bg }]}>
        <TopRow label="FIRM · 0 UNLOCKS LEFT" onClose={onDone} />
        <View style={styles.center}>
          <IconCircle icon="hand-right-outline" size={64} />
          <Text style={[type.setupTitle, styles.centerText, { color: c.textPrimary, marginTop: 20 }]}>
            You've used both unlocks
          </Text>
          <Text style={[type.body, styles.centerText, { color: c.textSecondary, marginTop: 8 }]}>
            Your apps open at {formatClock(next.at)}.
          </Text>
        </View>
        <View style={styles.footer}>
          <PrimaryButton label="Back to focus" onPress={onDone} />
        </View>
      </SafeAreaView>
    );
  }

  const counting = left > 0;
  const needsPro = !isPro && minutes > FREE_MAX_UNLOCK_MINUTES;
  const canUnlock = !counting && reason != null && !needsPro;
  const label = counting
    ? `Unlock in ${left}s`
    : !reason
      ? 'Choose a reason'
      : appName
        ? `Unlock ${appName} for ${minutes} min`
        : `Unlock for ${minutes} min`;
  const leftCount = Math.min(unlocksLeft, FIRM_UNLOCKS_PER_SESSION);

  const unlock = async () => {
    if (!reason) return;
    setBusy(true);
    const result = await grantUnlock(minutes, reason);
    setBusy(false);
    if (!result.ok) return showSnackbar(result.reason);
    haptics.success();
    onDone();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: c.bg }]}>
      <TopRow label={`FIRM · ${leftCount} ${leftCount === 1 ? 'UNLOCK' : 'UNLOCKS'} LEFT`} onClose={onDone} />
      <Animated.ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[styles.disc, { backgroundColor: c.accentTint, transform: [{ scale: reduceMotion ? 1 : disc }] }]}
        >
          <Text style={[styles.discLabel, { color: c.textPrimary }]}>{inhaling ? 'Breathe in' : 'Breathe out'}</Text>
          <Text style={[styles.bigNumber, { color: c.accent }]}>{left}</Text>
        </Animated.View>

        <Text style={[styles.title, styles.centerText, { color: c.textPrimary, marginTop: 28 }]}>
          {appName ? `Why do you need ${appName}?` : 'Why do you need to unlock?'}
        </Text>
        <View style={{ gap: 10, marginTop: 16, width: '100%' }}>
          {REASONS.map((r) => (
            <SelectOption key={r.id} selected={reason === r.id} onPress={() => setReason(r.id)} style={styles.reason}>
              <Text style={[styles.reasonLabel, { color: c.textPrimary }]}>{r.label}</Text>
            </SelectOption>
          ))}
        </View>
        {reason === 'bored' && (
          <Text style={[type.secondary, styles.centerText, { color: c.textSecondary, marginTop: 12 }]}>
            {next.breakIn != null
              ? `That's okay. Your break starts in ${next.breakIn} min.`
              : `That's okay. Your apps open at ${formatClock(next.at)}.`}
          </Text>
        )}

        <Text style={[type.overline, { color: c.textSecondary, marginTop: 20, alignSelf: 'flex-start' }]}>Unlock for</Text>
        <View style={{ marginTop: 8, width: '100%' }}>
          <DurationWheel value={minutes} onChange={setMinutes} isPro={isPro} />
        </View>
        {needsPro && <LongerBreakUpsell onStick={() => setMinutes(FREE_MAX_UNLOCK_MINUTES)} />}
        <Text style={[type.caption, styles.centerText, { color: c.textSecondary, marginTop: 12 }]}>
          This shows up in your session summary.
        </Text>
        <TextButton label="Back to focus" onPress={onDone} style={{ marginTop: 4 }} />
      </Animated.ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          label={label}
          disabled={!canUnlock}
          loading={busy}
          onPress={unlock}
          onDisabledPress={() =>
            showSnackbar(counting ? 'Finish breathing first' : needsPro ? 'Longer unlocks need Pro' : 'Choose a reason first')
          }
        />
      </View>
    </SafeAreaView>
  );
}

// ─── S11 Locked screen (Locked) ────────────────────────────────────────────────

const HOLD_MS = 10_000;

export function LockedScreen({ onDone }: Props) {
  const { c, isDark } = useBlockingTheme();
  const { session, shield, quickBlock, emergencyUnlock, canUseEmergencyToday, showSnackbar, unlockTarget } = useBlocking();
  const subject = unlockTarget?.appName ?? 'Your apps';
  const opens = unlockTarget?.appName ? 'opens' : 'open';
  const [emergencyLeft, setEmergencyLeft] = useState<boolean | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [, tick] = useState(0);
  const fill = useRef(new Animated.Value(0)).current;
  const holding = useRef(false);
  const ticks = useRef<ReturnType<typeof setInterval> | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    canUseEmergencyToday().then(setEmergencyLeft);
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [canUseEmergencyToday]);

  // The block this screen is about: the Pomodoro focus block, else the quick block or schedule run.
  const now = Date.now();
  const pomodoro = shield.sources.find((s) => s.kind === 'pomodoro');
  let start = now;
  let label = 'Block';
  if (pomodoro && session) {
    label = 'Focus block';
    start = session.keepLockedThroughBreaks ? session.startedAt : session.phaseEndsAt - session.focusMinutes * 60_000;
  } else if (quickBlock) {
    label = 'Quick block';
    start = quickBlock.startedAt;
  } else if (shield.sources[0]?.kind === 'schedule') {
    label = shield.sources[0].label ?? 'Schedule';
    start = shield.sources[0].startAt;
  }
  const end = shield.endAt || now;
  const pct = end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 0;
  const minsLeft = Math.max(0, Math.ceil((end - now) / 60_000));

  const stopHold = () => {
    if (ticks.current) clearInterval(ticks.current);
    ticks.current = null;
  };

  const onPressIn = () => {
    if (!emergencyLeft) return;
    holding.current = true;
    setHint(null);
    let step = 0;
    ticks.current = setInterval(() => haptics.holdTick(++step), 2000);
    Animated.timing(fill, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start(
      async ({ finished }) => {
        stopHold();
        if (!finished || !holding.current) return;
        holding.current = false;
        haptics.holdTick(5);
        const result = await emergencyUnlock();
        if (!result.ok) {
          fill.setValue(0);
          return showSnackbar(result.reason);
        }
        showSnackbar(`Emergency unlock used · Apps open until ${formatClock(end)}`);
        onDone();
      }
    );
  };

  const onPressOut = () => {
    if (!holding.current) return;
    holding.current = false;
    stopHold();
    fill.stopAnimation();
    Animated.timing(fill, { toValue: 0, duration: 250, useNativeDriver: false }).start();
    setHint('Hold for the full 10 seconds');
  };

  useEffect(() => stopHold, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: c.bg }]}>
      <TopRow label="LOCKED MODE" onClose={onDone} />
      <View style={styles.center}>
        <IconCircle icon="lock-closed-outline" size={64} />
        <Text style={[type.setupTitle, styles.centerText, { color: c.textPrimary, marginTop: 20 }]}>
          Locked until {formatClock(end)}
        </Text>
        <Text style={[type.body, styles.centerText, { color: c.textSecondary, marginTop: 8 }]}>
          {pomodoro
            ? `You chose Locked for this session. ${subject} ${opens} on your break.`
            : `You chose Locked for this block. ${subject} ${opens} when it ends.`}
        </Text>

        <View style={[styles.progressCard, cardShadow(isDark), { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.progressHead}>
            <Text style={[type.bodyStrong, { color: c.textPrimary }]}>{label}</Text>
            <Text style={[type.bodyStrong, type.tabular, { color: c.textPrimary }]}>{Math.round(pct * 100)}%</Text>
          </View>
          <View style={[styles.bar, { backgroundColor: c.border }]}>
            <View style={[styles.barFill, { backgroundColor: c.accent, width: `${pct * 100}%` }]} />
          </View>
          <Text style={[type.caption, type.tabular, { color: c.textSecondary, marginTop: 8 }]}>
            {minsLeft} min left
          </Text>
        </View>
        <PrimaryButton label="Back to focus" onPress={onDone} style={{ marginTop: 24, alignSelf: 'stretch' }} />
      </View>

      <View style={[styles.footer, { paddingBottom: 40 }]}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={!emergencyLeft}
          accessibilityRole="button"
          accessibilityLabel="Hold for emergency unlock"
          accessibilityHint="Hold for 10 seconds"
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          style={[
            styles.holdButton,
            { borderColor: emergencyLeft ? c.danger : c.textTertiary },
          ]}
        >
          <Animated.View
            style={[
              styles.holdFill,
              { backgroundColor: c.dangerTint, width: fill.interpolate({ inputRange: [0, 1], outputRange: [0, trackWidth] }) },
            ]}
          />
          <Ionicons name="lock-closed-outline" size={18} color={emergencyLeft ? c.danger : c.textTertiary} />
          <Text style={[styles.holdLabel, { color: emergencyLeft ? c.danger : c.textTertiary }]}>
            {emergencyLeft === false ? 'No emergency unlocks left today' : 'Hold for emergency unlock'}
          </Text>
        </Pressable>
        <Text style={[type.caption, styles.centerText, { color: c.textSecondary }]}>
          {hint ?? (emergencyLeft === false ? 'Resets at midnight' : '1 left today · Ends blocking for this focus block')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: { height: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { height: 28, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, justifyContent: 'center' },
  pillLabel: { fontSize: 13, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  centerText: { textAlign: 'center' },
  scroll: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  bigNumber: { fontSize: 32, lineHeight: 38, fontWeight: '700', fontVariant: ['tabular-nums'] },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 8 },
  disc: { width: 168, height: 168, borderRadius: 84, alignItems: 'center', justifyContent: 'center' },
  discLabel: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  reason: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14 },
  reasonLabel: { fontSize: 16, lineHeight: 22, fontWeight: '500', textAlign: 'center' },
  track: { flexDirection: 'row', borderRadius: 14, padding: 4, marginTop: 8, width: '100%' },
  segment: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentLabel: { fontSize: 15, lineHeight: 20 },
  progressCard: { marginTop: 24, alignSelf: 'stretch', borderRadius: 20, borderWidth: 1, padding: 16 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { height: 8, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  holdButton: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  holdLabel: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
});
