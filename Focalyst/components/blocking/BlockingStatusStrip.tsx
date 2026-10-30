import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { FIRM_PAUSE_LIMIT_MS, openPaywall, useBlocking } from '../../src/blocking/BlockingContext';
import { formatClock, formatCountdown, selectionTotal } from '../../src/blocking/levels';
import { AppIconStrip } from './AppIcon';
import { LevelChip } from './Chips';

const PAUSE_WARNING_ID = 'focalyst-blocking-alert';

type Props = {
  isBreak: boolean;
  isPaused: boolean;
  timeLeftSec: number;
  /** Firm: a pause that runs 10 minutes ends the session. */
  onAutoEnd: () => void;
};

/**
 * Compact blocking status that sits between the timer dial and the Pause/End buttons:
 * locked icons, count, level, and a way to unlock from inside Focalyst.
 */
export function BlockingStatusStrip({ isBreak, isPaused, timeLeftSec, onAutoEnd }: Props) {
  const { c, isDark } = useBlockingTheme();
  // Dark tokens are surface #181C2C and border #262B3D.
  const router = useRouter();
  const { session, shield, config, unlockWindow, lockNow } = useBlocking();
  // Re-render each second for the unlock countdown and pause timer.
  const [, tick] = React.useState(0);
  useEffect(() => {
    if (!unlockWindow) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [unlockWindow]);
  const now = Date.now();
  const phase = session?.phase ?? 'idle';

  // ── Firm pause: shields stay; the session ends after 10 minutes paused ─────
  const pausedAt = session?.pausedAt ?? null;
  const firmPause = isPaused && phase === 'paused_locked' && session?.level === 'firm' && pausedAt != null;
  const pauseLeftSec = firmPause ? Math.max(0, (pausedAt! + FIRM_PAUSE_LIMIT_MS - now) / 1000) : 0;
  const endedRef = useRef(false);
  useEffect(() => {
    if (firmPause && pauseLeftSec <= 0 && !endedRef.current) {
      endedRef.current = true;
      onAutoEnd();
    }
  }, [firmPause, pauseLeftSec, onAutoEnd]);

  useEffect(() => {
    if (!firmPause || pausedAt == null) return;
    const fireIn = (pausedAt + FIRM_PAUSE_LIMIT_MS - 2 * 60_000 - Date.now()) / 1000;
    if (fireIn > 1) {
      Notifications.scheduleNotificationAsync({
        identifier: PAUSE_WARNING_ID,
        content: { title: 'Your session ends in 2 minutes', body: 'Resume to keep going.' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(fireIn) },
      }).catch(() => {});
    }
    return () => {
      Notifications.cancelScheduledNotificationAsync(PAUSE_WARNING_ID).catch(() => {});
    };
  }, [firmPause, pausedAt]);

  const openUnlock = () => router.push('/blocking/unlock');
  const phaseEnd = now + timeLeftSec * 1000;
  const bar = [styles.bar, { backgroundColor: c.surface, borderColor: c.border }];
  const strong = isDark ? '#FFFFFF' : c.textPrimary;

  let left: React.ReactNode;
  let right: React.ReactNode = null;

  if (unlockWindow) {
    const remaining = Math.max(0, (unlockWindow.endsAt - now) / 1000);
    left = (
      <>
        <Ionicons name="lock-open-outline" size={18} color={c.success} />
        <Text numberOfLines={1} style={[styles.label, { color: strong }]}>
          {unlockWindow.appName ? `${unlockWindow.appName} is open` : 'Unlocked'} · {formatCountdown(remaining)} left
        </Text>
      </>
    );
    right = <BarAction label="Lock now" color={c.accent} onPress={lockNow} />;
  } else if (phase === 'timer_only' && !shield.active) {
    const fix = session?.permissionLost
      ? () => router.push('/blocking/permission?mode=fix')
      : session?.blockedByPlan
        ? openPaywall
        : undefined;
    left = (
      <>
        <Ionicons name="alert-circle-outline" size={18} color={fix ? c.danger : c.textSecondary} />
        <Text numberOfLines={1} style={[styles.label, { color: strong }]}>
          {session?.blockedByPlan ? 'Free plan: 2 apps max' : 'Blocking is off'}
        </Text>
      </>
    );
    if (fix) right = <BarAction label={session?.blockedByPlan ? 'Upgrade' : 'Fix'} color={c.accent} onPress={fix} />;
  } else if (shield.active) {
    left = (
      <>
        <Pressable onPress={openUnlock} accessibilityLabel="Unlock apps" hitSlop={6}>
          <AppIconStrip count={config.blocklistSummary.appCount} size={22} locked animateOnMount ringColor={c.surface} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.label, { color: strong }]}>
          {selectionTotal(config.blocklistSummary)} locked
        </Text>
        <LevelChip level={shield.level} compact />
      </>
    );
    right = <BarAction label={shield.level === 'locked' ? 'Emergency' : 'Unlock'} color={c.accent} onPress={openUnlock} />;
  } else {
    const line =
      phase === 'focus_emergency_open'
        ? `Emergency · open until ${formatClock(phaseEnd)}`
        : phase === 'paused_open'
          ? 'Apps open while paused'
          : isBreak
            ? `Apps open · lock at ${formatClock(phaseEnd)}`
            : 'Apps are open';
    left = (
      <>
        <Ionicons name="lock-open-outline" size={18} color={c.success} />
        <Text numberOfLines={1} style={[styles.label, type.tabular, { color: strong }]}>{line}</Text>
      </>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={bar}>
        <View style={styles.left}>{left}</View>
        {right}
      </View>
      {firmPause && !unlockWindow && (
        <Text numberOfLines={2} style={[type.caption, type.tabular, styles.pauseNote, { color: c.textSecondary }]}>
          Apps stay locked while paused · Session ends in {formatCountdown(pauseLeftSec)} if you don't resume
        </Text>
      )}
    </View>
  );
}

function BarAction({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={10} style={styles.action}>
      <Text numberOfLines={1} style={[styles.actionLabel, { color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Width comes from the parent it shares with the Pause/End row, so both edges line up.
  wrap: { width: '100%', marginTop: 12, marginBottom: 14 },
  bar: {
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600', flexShrink: 1, fontVariant: ['tabular-nums'] },
  action: { minHeight: 44, justifyContent: 'center', flexShrink: 0 },
  actionLabel: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  pauseNote: { marginTop: 6, textAlign: 'center' },
});
