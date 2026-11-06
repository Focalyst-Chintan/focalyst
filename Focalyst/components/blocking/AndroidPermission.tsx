import React, { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  Animated,
  AppState,
  BackHandler,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import * as Blocker from '../../modules/screen-time-blocker';
import type { AndroidPermissionsStatus } from '../../modules/screen-time-blocker';
import { type, useReduceMotion } from '../../constants/blockingTheme';
import { useBlocking } from '../../src/blocking/BlockingContext';
import { requestNotificationPermission } from '../../src/blocking/notifications';
import { haptics } from '../../src/blocking/haptics';
import { exitToFocus, useLeaveSetup, useSetupSteps } from '../../src/blocking/setupNav';
import { CircleIconButton, PressScale } from './Buttons';
import { GroupDivider } from './Form';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const ACCESSIBILITY_DISCLOSURE_CONSENT_KEY = 'accessibility_disclosure_consented';

/**
 * Strict dark-mode brand palette for Android permission & prominent disclosure:
 * Deep obsidian canvas (#08090C), elevated dark surfaces, cobalt (#1D4ED8),
 * periwinkle (#3B82F6, #93C5FD), and crisp white typography.
 */
const PALETTE = {
  bg: '#08090C',
  surface: '#11141C',
  surface2: '#161B26',
  iconCircle: '#161E31',
  border: '#1E2638',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  cobalt: '#1D4ED8',
  periwinkle: '#3B82F6',
  periwinkleLight: '#93C5FD',
  accentTint: 'rgba(59, 130, 246, 0.14)',
  onAccent: '#FFFFFF',
  success: '#34D399',
  successTint: 'rgba(52, 211, 153, 0.14)',
} as const;

const DISCLOSURE_SECTIONS = [
  {
    icon: 'InformationCircle' as const,
    ionicon: 'shield-checkmark-outline' as IconName,
    heading: 'Why does Focalyst need Accessibility access?',
    body: "Focalyst uses Android's AccessibilityService API to detect when you open applications that you have selected as distractions. When you open a blocked application during an active focus session, Focalyst uses this information to trigger its app-blocking pause screen.",
  },
  {
    icon: 'Eye' as const,
    ionicon: 'eye-outline' as IconName,
    heading: 'What information does Focalyst access?',
    bullets: [
      '• The identity (package name) of the application currently in the foreground when a window state changes.',
      '• App-opening events required to identify your selected distracting applications.',
      '• Focalyst does NOT read your screen content, text, messages, passwords, or keystrokes (window content retrieval is disabled).',
    ],
  },
  {
    icon: 'Lock' as const,
    ionicon: 'lock-closed-outline' as IconName,
    heading: 'How is this information used and handled?',
    body: 'This information is used solely to activate your selected distraction-blocking settings during an active focus session and log blocked app attempts for your personal focus insights. Your blocklist and blocking session events are stored locally on your device and synced securely to your Focalyst account. This data is never sold or shared with third parties for advertising.',
  },
  {
    icon: 'Options' as const,
    ionicon: 'options-outline' as IconName,
    heading: 'Your choice matters',
    body: "You can decline this permission and continue using all other Focalyst features (timers, tasks, habits, and notes). However, the distraction-blocking feature will remain unavailable until you grant the required permission. You can disable Focalyst's Accessibility Service at any time in your device's Android Settings.",
  },
];

/** Trailing status: a compact "Allow" button that morphs into a success check + "Allowed" (250 ms). */
function AllowStatus({ granted, onAllow, label }: { granted: boolean; onAllow: () => void; label: string }) {
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
        <Ionicons name="checkmark-circle" size={20} color={PALETTE.success} />
        <Text style={[styles.allowedLabel, { color: PALETTE.success }]}>Allowed</Text>
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
          style={[styles.allowButton, { backgroundColor: PALETTE.cobalt }]}
        >
          <Text style={[styles.allowLabel, { color: PALETTE.onAccent }]}>Allow</Text>
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
  granted: boolean | null;
  onAllow: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: PALETTE.iconCircle }]}>
        <Ionicons name={icon} size={20} color={PALETTE.periwinkle} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.bodyStrong, { color: PALETTE.textPrimary }]}>{title}</Text>
        <Text style={[type.secondary, { color: PALETTE.textSecondary }]}>{subtitle}</Text>
      </View>
      {granted == null ? (
        <View style={[styles.status, { width: 76 }]} />
      ) : (
        <AllowStatus granted={granted} onAllow={onAllow} label={title} />
      )}
    </View>
  );
}

/**
 * Full-screen Google Play Prominent Disclosure for Android AccessibilityService API.
 * Strictly requires explicit affirmative consent ("Agree") or refusal ("Don't agree").
 * Back button / system back gesture never grants consent and never opens settings.
 */
function AccessibilityProminentDisclosureModal({
  visible,
  onAgree,
  onDecline,
}: {
  visible: boolean;
  onAgree: () => void;
  onDecline: () => void;
}) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onDecline();
      return true;
    });
    return () => sub.remove();
  }, [visible, onDecline]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={false}
      onRequestClose={onDecline}
    >
      <View style={[styles.disclosureRoot, { paddingTop: Math.max(insets.top, 24) }]}>
        <ScrollView
          style={styles.disclosureScroll}
          contentContainerStyle={styles.disclosureContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badgeRow}>
            <View style={styles.disclosureIconWrap}>
              <Ionicons name="accessibility-outline" size={24} color={PALETTE.periwinkleLight} />
            </View>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>Accessibility Service Disclosure</Text>
            </View>
          </View>

          <Text style={styles.disclosureTitle}>Focalyst needs your permission</Text>

          <View style={styles.sectionsWrap}>
            {DISCLOSURE_SECTIONS.map((sec) => (
              <View key={sec.heading} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconCircle}>
                    <Ionicons name={sec.ionicon} size={18} color={PALETTE.periwinkleLight} />
                  </View>
                  <Text style={styles.sectionHeading}>{sec.heading}</Text>
                </View>
                {sec.body ? <Text style={styles.sectionBody}>{sec.body}</Text> : null}
                {sec.bullets ? (
                  <View style={styles.bulletList}>
                    {sec.bullets.map((b) => (
                      <Text key={b} style={styles.sectionBullet}>
                        {b}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </ScrollView>

        <View
          style={[
            styles.disclosureFooter,
            { paddingBottom: Math.max(insets.bottom, 20) + 12 },
          ]}
        >
          <View style={styles.consentButtonsRow}>
            <PressScale
              onPress={() => {
                haptics.light();
                onDecline();
              }}
              accessibilityLabel="Don't agree"
              style={styles.declineButton}
            >
              <Text style={styles.declineButtonLabel}>{"Don't agree"}</Text>
            </PressScale>

            <PressScale
              onPress={() => {
                haptics.light();
                onAgree();
              }}
              accessibilityLabel="Agree"
              style={styles.agreeButton}
            >
              <Text style={styles.agreeButtonLabel}>Agree</Text>
            </PressScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** S3 (Android): Usage access + the Accessibility "pause screen" service with Prominent Disclosure. */
export function AndroidPermission() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const steps = useSetupSteps('permission');
  const fixMode = steps.mode === 'fix';
  const { back, dialog } = useLeaveSetup(!fixMode && steps.isFirst);
  const { refreshPermission, draft, showSnackbar } = useBlocking();
  const [status, setStatus] = useState<AndroidPermissionsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [disclosureVisible, setDisclosureVisible] = useState(false);
  const initialDisclosureShownRef = useRef(false);

  const recheck = useCallback(async () => {
    const next = await Blocker.getAndroidPermissionsStatus();
    setStatus((prev) =>
      prev?.usageAccess === next.usageAccess && prev?.accessibilityEnabled === next.accessibilityEnabled ? prev : next
    );
    // Show the dedicated Prominent Disclosure immediately when entering the permission flow if Accessibility is not yet enabled.
    if (!next.accessibilityEnabled && !initialDisclosureShownRef.current) {
      initialDisclosureShownRef.current = true;
      setDisclosureVisible(true);
    }
    refreshPermission();
  }, [refreshPermission]);

  // Re-verify native permissions every time the user returns from Android Settings.
  useEffect(() => {
    recheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recheck();
    });
    return () => sub.remove();
  }, [recheck]);

  const handleAgreeDisclosure = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ACCESSIBILITY_DISCLOSURE_CONSENT_KEY, 'true');
    } catch {}
    setDisclosureVisible(false);
    await Blocker.openAccessibilitySettings();
  }, []);

  const handleDeclineDisclosure = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ACCESSIBILITY_DISCLOSURE_CONSENT_KEY, 'false');
    } catch {}
    setDisclosureVisible(false);
    showSnackbar('Distraction blocking remains disabled. All other Focalyst features remain available.');
    if (fixMode) router.back();
    else exitToFocus(router);
  }, [fixMode, router, showSnackbar]);

  const requestAccessibilityWithDisclosure = useCallback(() => {
    // Always display Prominent Disclosure before opening Accessibility Settings to enable the service.
    setDisclosureVisible(true);
  }, []);

  const ready = !!status?.usageAccess && !!status?.accessibilityEnabled;

  const proceed = async () => {
    setBusy(true);
    try {
      const latest = await Blocker.getAndroidPermissionsStatus();
      if (!latest.usageAccess || !latest.accessibilityEnabled) {
        haptics.error();
        setStatus(latest);
        return;
      }
      if ((await refreshPermission()) !== 'approved') return;
      if (draft.notifyLockUnlock) await requestNotificationPermission();
      if (fixMode) router.back();
      else router.push(`/blocking/apps?${steps.carry}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screenRoot, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.headerWrap}>
        {fixMode ? (
          <View style={styles.fixBar}>
            <CircleIconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Back" />
          </View>
        ) : (
          <View style={styles.topBar}>
            <CircleIconButton icon="arrow-back" onPress={back} accessibilityLabel="Back" />
            <View style={styles.segments} accessibilityElementsHidden>
              {Array.from({ length: steps.total }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.segment,
                    { backgroundColor: i < steps.step ? PALETTE.periwinkle : PALETTE.border },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.stepLabel, { color: PALETTE.textSecondary }]}>
              Step {steps.step} of {steps.total}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[type.setupTitle, { color: PALETTE.textPrimary, marginTop: 24 }]}>
          Two permissions to make blocking work
        </Text>
        <Text style={[type.body, { color: PALETTE.textSecondary, marginTop: 8 }]}>
          Focalyst only uses these to detect and pause distracting apps you select during focus sessions.
        </Text>

        <View style={styles.card}>
          <PermissionRow
            icon="stats-chart-outline"
            title="Usage access"
            subtitle="Lets Focalyst calculate app usage and identify your distracting apps"
            granted={status ? status.usageAccess : null}
            onAllow={() => Blocker.openUsageAccessSettings()}
          />
          <GroupDivider />
          <PermissionRow
            icon="phone-portrait-outline"
            title="Show the pause screen"
            subtitle="Uses Accessibility Service to detect blocked apps and show the pause shield"
            granted={status ? status.accessibilityEnabled : null}
            onAllow={requestAccessibilityWithDisclosure}
          />
        </View>

        <Pressable
          onPress={() => setDisclosureVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="View Accessibility Service Disclosure"
          style={({ pressed }) => [styles.reviewDisclosureButton, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Ionicons name="document-text-outline" size={16} color={PALETTE.periwinkleLight} />
          <Text style={styles.reviewDisclosureText}>Review Accessibility Service Disclosure</Text>
        </Pressable>

        {status?.accessibilityEnabled ? (
          <View style={styles.revokeCard}>
            <View style={styles.revokeHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color={PALETTE.success} />
              <Text style={styles.revokeTitle}>Accessibility Service is currently active</Text>
            </View>
            <Text style={styles.revokeBody}>
              You are in full control. You can turn off or revoke Focalyst&apos;s Accessibility Service permission at any time in your device settings.
            </Text>
            <Pressable
              onPress={() => Blocker.openAccessibilitySettings()}
              accessibilityRole="button"
              accessibilityLabel="Manage or Disable in Android Settings"
              style={({ pressed }) => [styles.revokeLinkButton, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Ionicons name="settings-outline" size={16} color={PALETTE.periwinkleLight} />
              <Text style={styles.revokeLinkText}>Manage or Disable in Android Settings</Text>
              <Ionicons name="open-outline" size={14} color={PALETTE.periwinkleLight} />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footerWrap,
          { paddingBottom: Math.max(insets.bottom, 20) + 12 },
        ]}
      >
        <PressScale
          onPress={proceed}
          onDisabledPress={() => haptics.error()}
          disabled={!ready || busy}
          accessibilityLabel={fixMode ? 'Done' : 'Continue'}
          style={[
            styles.primaryProceedButton,
            !ready
              ? { backgroundColor: PALETTE.surface2, borderWidth: 1, borderColor: PALETTE.border }
              : { backgroundColor: PALETTE.cobalt },
          ]}
        >
          <Text
            style={[
              type.buttonLabel,
              { color: !ready ? PALETTE.textSecondary : PALETTE.onAccent },
            ]}
          >
            {fixMode ? 'Done' : 'Continue'}
          </Text>
        </PressScale>
      </View>

      <AccessibilityProminentDisclosureModal
        visible={disclosureVisible}
        onAgree={handleAgreeDisclosure}
        onDecline={handleDeclineDisclosure}
      />

      {dialog}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },
  screenScroll: {
    flex: 1,
  },
  headerWrap: {
    paddingHorizontal: 20,
  },
  fixBar: {
    height: 56,
    justifyContent: 'center',
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  card: {
    marginTop: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PALETTE.border,
    backgroundColor: PALETTE.surface,
    paddingVertical: 4,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    height: 32,
  },
  statusCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  allowButton: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  allowedLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  reviewDisclosureButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: PALETTE.surface,
    borderWidth: 1,
    borderColor: PALETTE.border,
    alignSelf: 'flex-start',
  },
  reviewDisclosureText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: PALETTE.periwinkleLight,
  },
  revokeCard: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.border,
    backgroundColor: PALETTE.surface,
    padding: 16,
    gap: 8,
  },
  revokeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  revokeTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: PALETTE.textPrimary,
  },
  revokeBody: {
    fontSize: 13,
    lineHeight: 18,
    color: PALETTE.textSecondary,
  },
  revokeLinkButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: PALETTE.accentTint,
    alignSelf: 'flex-start',
  },
  revokeLinkText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: PALETTE.periwinkleLight,
  },
  footerWrap: {
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: PALETTE.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryProceedButton: {
    minHeight: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  // Prominent Disclosure Modal Styles
  disclosureRoot: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },
  disclosureScroll: {
    flex: 1,
  },
  disclosureContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  disclosureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PALETTE.iconCircle,
    borderWidth: 1,
    borderColor: PALETTE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PALETTE.accentTint,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: PALETTE.periwinkleLight,
    textTransform: 'uppercase',
  },
  disclosureTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: PALETTE.textPrimary,
    marginBottom: 18,
  },
  sectionsWrap: {
    gap: 12,
  },
  sectionCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.border,
    padding: 16,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PALETTE.iconCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: PALETTE.textPrimary,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 20,
    color: PALETTE.textSecondary,
  },
  bulletList: {
    gap: 6,
  },
  sectionBullet: {
    fontSize: 14,
    lineHeight: 20,
    color: PALETTE.textSecondary,
  },
  disclosureFooter: {
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: PALETTE.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  consentButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    minHeight: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  declineButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  agreeButton: {
    flex: 1,
    minHeight: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  agreeButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
