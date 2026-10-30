import React, { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Animated, AppState, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import * as Blocker from '../../modules/screen-time-blocker';
import type { AndroidPermissionsStatus } from '../../modules/screen-time-blocker';
import { cardShadow, type, useBlockingTheme, useReduceMotion } from '../../constants/blockingTheme';
import { useBlocking } from '../../src/blocking/BlockingContext';
import { requestNotificationPermission } from '../../src/blocking/notifications';
import { haptics } from '../../src/blocking/haptics';
import { useLeaveSetup, useSetupSteps } from '../../src/blocking/setupNav';
import { SetupScreen } from './SetupScreen';
import { SetupTopBar } from './SetupTopBar';
import { CircleIconButton, PressScale, PrimaryButton } from './Buttons';
import { GroupDivider, IconCircle } from './Form';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Google Play prominent disclosure for the Accessibility service. Do not reword. */
const PLAY_DISCLOSURE =
  'Focalyst uses the Accessibility service only to detect when you open an app you chose to block during a focus session, and to show the pause screen. No data is collected or shared.';

/** Trailing status: a compact "Allow" button that morphs into a success check + "Allowed" (250 ms). */
function AllowStatus({ granted, onAllow, label }: { granted: boolean; onAllow: () => void; label: string }) {
  const { c } = useBlockingTheme();
  const reduceMotion = useReduceMotion();
  const morph = useRef(new Animated.Value(granted ? 1 : 0)).current;
  const prev = useRef(granted);

  useEffect(() => {
    if (prev.current === granted) return;
    prev.current = granted;
    if (granted) haptics.success();
    if (reduceMotion) {
      morph.setValue(granted ? 1 : 0);
      return;
    }
    Animated.timing(morph, {
      toValue: granted ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [granted, morph, reduceMotion]);

  // Width eases from the button's to the label's while the two crossfade.
  const width = morph.interpolate({ inputRange: [0, 1], outputRange: [76, 92] });
  const allowOpacity = morph.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  const allowedOpacity = morph.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <Animated.View style={[styles.status, { width }]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.statusCenter, { opacity: allowedOpacity }]}
        pointerEvents="none"
        accessibilityElementsHidden={!granted}
      >
        <Ionicons name="checkmark-circle" size={20} color={c.success} />
        <Text style={[styles.allowedLabel, { color: c.success }]}>Allowed</Text>
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.statusCenter, { opacity: allowOpacity }]}
        pointerEvents={granted ? 'none' : 'auto'}
      >
        <PressScale
          onPress={() => {
            haptics.light();
            onAllow();
          }}
          accessibilityLabel={`Allow ${label}`}
          hitSlop={8}
          style={[styles.allowButton, { backgroundColor: c.accentFill }]}
        >
          <Text style={[styles.allowLabel, { color: c.onAccent }]}>Allow</Text>
        </PressScale>
      </Animated.View>
    </Animated.View>
  );
}

function PermissionRow({
  icon,
  title,
  subtitle,
  granted,
  onAllow,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  /** Null until the first check, so an already-granted row doesn't play the grant animation. */
  granted: boolean | null;
  onAllow: () => void;
}) {
  const { c } = useBlockingTheme();
  return (
    <View style={styles.row}>
      <IconCircle icon={icon} />
      <View style={{ flex: 1 }}>
        <Text style={[type.bodyStrong, { color: c.textPrimary }]}>{title}</Text>
        <Text style={[type.secondary, { color: c.textSecondary }]}>{subtitle}</Text>
      </View>
      {granted == null ? (
        <View style={[styles.status, { width: 76 }]} />
      ) : (
        <AllowStatus granted={granted} onAllow={onAllow} label={title} />
      )}
    </View>
  );
}

/** S3 (Android): Usage access + the Accessibility "pause screen" service. `?mode=fix` comes from S1 state D. */
export function AndroidPermission() {
  const { c, isDark } = useBlockingTheme();
  const router = useRouter();
  const steps = useSetupSteps('permission');
  const fixMode = steps.mode === 'fix';
  const { back, dialog } = useLeaveSetup(!fixMode && steps.isFirst);
  const { refreshPermission, draft } = useBlocking();
  const [status, setStatus] = useState<AndroidPermissionsStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const recheck = useCallback(async () => {
    const next = await Blocker.getAndroidPermissionsStatus();
    setStatus((prev) =>
      prev?.usageAccess === next.usageAccess && prev?.accessibilityEnabled === next.accessibilityEnabled ? prev : next
    );
    // Keeps S1 and the session logic in step with what Settings now says.
    refreshPermission();
  }, [refreshPermission]);

  // Each row updates the moment the user comes back from Android Settings.
  useEffect(() => {
    recheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recheck();
    });
    return () => sub.remove();
  }, [recheck]);

  const ready = !!status?.usageAccess && !!status?.accessibilityEnabled;

  const proceed = async () => {
    setBusy(true);
    try {
      if ((await refreshPermission()) !== 'approved') return;
      // Android 13+ asks for POST_NOTIFICATIONS; the countdown and "locks again" alerts need it.
      if (draft.notifyLockUnlock) await requestNotificationPermission();
      if (fixMode) router.back();
      else router.push(`/blocking/apps?${steps.carry}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SetupScreen
      header={
        fixMode ? (
          <View style={styles.fixBar}>
            <CircleIconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Back" />
          </View>
        ) : (
          <SetupTopBar step={steps.step} total={steps.total} onBack={back} />
        )
      }
      footer={
        <PrimaryButton
          label={fixMode ? 'Done' : 'Continue'}
          onPress={proceed}
          loading={busy}
          disabled={!ready}
          onDisabledPress={() => haptics.error()}
        />
      }
    >
      <Text style={[type.setupTitle, { color: c.textPrimary, marginTop: 24 }]}>Two permissions to make blocking work</Text>
      <Text style={[type.body, { color: c.textSecondary, marginTop: 8 }]}>
        Focalyst only uses these to lock apps during focus.
      </Text>

      <View style={[styles.card, cardShadow(isDark), { backgroundColor: c.surface, borderColor: c.border }]}>
        <PermissionRow
          icon="stats-chart-outline"
          title="Usage access"
          subtitle="Lets Focalyst see which app is open"
          granted={status ? status.usageAccess : null}
          onAllow={() => Blocker.openUsageAccessSettings()}
        />
        <GroupDivider />
        <PermissionRow
          icon="phone-portrait-outline"
          title="Show the pause screen"
          subtitle="Lets Focalyst cover a locked app"
          granted={status ? status.accessibilityEnabled : null}
          onAllow={() => Blocker.openAccessibilitySettings()}
        />
      </View>

      <Text style={[type.caption, { color: c.textSecondary, marginTop: 12 }]}>{PLAY_DISCLOSURE}</Text>
      {dialog}
    </SetupScreen>
  );
}

const styles = StyleSheet.create({
  fixBar: { height: 56, justifyContent: 'center' },
  card: { marginTop: 24, borderRadius: 24, borderWidth: 1, paddingVertical: 4 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  status: { height: 32 },
  statusCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  allowButton: { height: 32, borderRadius: 16, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  allowLabel: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  allowedLabel: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
});
