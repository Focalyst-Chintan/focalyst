import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppTokenLabelView } from '../../modules/screen-time-blocker';
import { floatingShadow, type, useBlockingTheme } from '../../constants/blockingTheme';
import { RATCHET_MESSAGE, useBlocking } from '../../src/blocking/BlockingContext';
import { formatClock, selectionLabel } from '../../src/blocking/levels';
import { requestNotificationPermission } from '../../src/blocking/notifications';
import { exitToFocus, useLeaveSetup, useSetupSteps } from '../../src/blocking/setupNav';
import { SetupScreen } from '../../components/blocking/SetupScreen';
import { SetupTopBar } from '../../components/blocking/SetupTopBar';
import { CircleIconButton, DangerTextButton, PrimaryButton } from '../../components/blocking/Buttons';
import { Banner, GroupDivider, SettingsGroup, SettingsRow, ToggleRow } from '../../components/blocking/Form';
import { AppIcon, AppIconStrip } from '../../components/blocking/AppIcon';
import { AllowedAppsSheet } from '../../components/blocking/AllowedAppsSheet';
import { LevelChip } from '../../components/blocking/Chips';
import { Dialog } from '../../components/blocking/Overlays';
import { QuickBlockSheet } from '../../components/blocking/QuickBlockSheet';

const FOCALYST_ICON = require('../../assets/images/app-icon.png');
const USER_CHIPS_MAX = 8;
const IS_ANDROID = Platform.OS === 'android';
/** POST_NOTIFICATIONS became a runtime permission in Android 13 (API 33). */
const NEEDS_NOTIFICATION_PROMPT = IS_ANDROID && Number(Platform.Version) >= 33;

function Chip({ children, tinted, onPress }: { children: React.ReactNode; tinted?: boolean; onPress?: () => void }) {
  const { c } = useBlockingTheme();
  const body = (
    <View
      style={[
        styles.chip,
        tinted ? { backgroundColor: c.accentTint } : { backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  );
}

/** S6. Setup mode ("Set your rules") or `?mode=manage` ("Blocking settings"). */
export default function BlockingRules() {
  const { c, glass, isDark } = useBlockingTheme();
  const router = useRouter();
  const steps = useSetupSteps('rules');
  const manage = steps.mode === 'manage';
  const { back, dialog } = useLeaveSetup(!manage && steps.isFirst);
  const blocking = useBlocking();
  const {
    config,
    draft,
    session,
    quickBlock,
    schedules,
    canEditBlocklist,
    canEditAllowed,
    canLoosen,
    showSnackbar,
  } = blocking;
  const [quickOpen, setQuickOpen] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [allowedOpen, setAllowedOpen] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const values = manage ? config : { ...config, ...draft };
  const running = session != null;
  const ratchet = () => showSnackbar(RATCHET_MESSAGE);
  const levelLocked = running && session.level === 'locked';
  const activeSchedules = schedules.filter((s) => s.enabled).length;

  const setBreaks = (v: boolean) => {
    if (!manage) return blocking.updateDraft({ unblockOnBreaks: v });
    const r = blocking.setUnblockOnBreaks(v);
    if (!r.ok) showSnackbar(r.reason);
  };
  const setNotify = async (v: boolean) => {
    if (v) await requestNotificationPermission();
    if (manage) blocking.setNotifyLockUnlock(v);
    else blocking.updateDraft({ notifyLockUnlock: v });
  };
  const addAllowed = async () => {
    if (IS_ANDROID) return setAllowedOpen(true);
    const r = await blocking.pickApps('allowed');
    if (!r.ok) showSnackbar(r.reason);
  };
  const removeAllowed = async (pkg: string) => {
    const r = await blocking.setAllowedPackages(blocking.allowedPackages.filter((p) => p !== pkg));
    if (!r.ok) showSnackbar(r.reason);
  };

  // Android 13+: ask for POST_NOTIFICATIONS the first time "Notify me" is shown ON (flow 6.2).
  useEffect(() => {
    if (NEEDS_NOTIFICATION_PROMPT && values.notifyLockUnlock) requestNotificationPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allowed = config.allowedSummary;
  const userChips = Math.min(allowed.appCount, USER_CHIPS_MAX);
  const otherAllowed = allowed.categoryCount + allowed.webCount + Math.max(0, allowed.appCount - USER_CHIPS_MAX);

  const content = (
    <>
      {manage && !canLoosen && (
        <View style={{ marginBottom: 20 }}>
          <Banner
            icon="lock-closed-outline"
            text={
              running
                ? 'A focus session is running. You can make blocking stricter, not looser.'
                : 'Blocking is running. You can make it stricter, not looser.'
            }
          />
        </View>
      )}

      <View style={{ gap: 20 }}>
        {manage && (
          <SettingsGroup label="Blocked apps">
            <SettingsRow
              leading={<AppIconStrip count={config.blocklistSummary.appCount} ringColor={c.surface} />}
              title={selectionLabel(config.blocklistSummary)}
              chevron
              locked={!canEditBlocklist}
              onLockedPress={ratchet}
              onPress={() => router.push('/blocking/apps?mode=edit')}
            />
          </SettingsGroup>
        )}

        {manage && (
          <SettingsGroup label="Strictness">
            <SettingsRow
              title="Level"
              value={<LevelChip level={config.level} />}
              chevron
              locked={levelLocked}
              onLockedPress={ratchet}
              onPress={() => router.push('/blocking/level?mode=edit')}
            />
          </SettingsGroup>
        )}

        <SettingsGroup label="During Pomodoro">
          {manage && (
            <>
              <ToggleRow
                title="Lock apps when focus starts"
                value={config.enabled}
                onChange={(v) => blocking.setEnabled(v)}
              />
              <GroupDivider />
            </>
          )}
          <ToggleRow
            title="Open apps during breaks"
            subtitle="Breaks become a reward"
            value={values.unblockOnBreaks}
            onChange={setBreaks}
            locked={manage && !canLoosen && !values.unblockOnBreaks}
            onLockedPress={ratchet}
          />
          <GroupDivider />
          <ToggleRow title="Notify me when apps lock and unlock" value={values.notifyLockUnlock} onChange={setNotify} />
          {!IS_ANDROID && (
            <Text style={[type.caption, styles.note, { color: c.textSecondary }]}>
              Focus blocks under 15 min keep apps locked through breaks on iPhone.
            </Text>
          )}
        </SettingsGroup>

        <SettingsGroup label="Always allowed">
          <View style={[styles.chips, !canEditAllowed && manage && { opacity: 0.5 }]}>
            {/* iOS never exposes the Phone app's icon to third parties, and a stand-in glyph is banned. */}
            <Chip>
              <Text style={[styles.chipLabel, { color: c.textPrimary }]}>Phone</Text>
            </Chip>
            <Chip>
              <Image source={FOCALYST_ICON} style={styles.focalystIcon} />
              <Text style={[styles.chipLabel, { color: c.textPrimary }]}>Focalyst</Text>
            </Chip>
            {IS_ANDROID &&
              blocking.allowedPackages.map((pkg) => (
                <Chip key={pkg}>
                  <AppIcon packageName={pkg} size={20} />
                  <Text style={[styles.chipLabel, { color: c.textPrimary }]}>
                    {blocking.appInfo(pkg)?.appName ?? pkg}
                  </Text>
                  <Pressable
                    onPress={() => removeAllowed(pkg)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${blocking.appInfo(pkg)?.appName ?? pkg}`}
                  >
                    <Ionicons name="close" size={16} color={c.textSecondary} />
                  </Pressable>
                </Chip>
              ))}
            {!IS_ANDROID && Array.from({ length: userChips }, (_, i) => (
              <Chip key={i} onPress={canEditAllowed ? addAllowed : ratchet}>
                <AppTokenLabelView
                  tokenIndex={i}
                  mode="allowed"
                  size={20}
                  colorScheme={isDark ? 'dark' : 'light'}
                  style={{ width: 20, height: 20 }}
                />
              </Chip>
            ))}
            {!IS_ANDROID && otherAllowed > 0 && (
              <Chip onPress={canEditAllowed ? addAllowed : ratchet}>
                <Text style={[styles.chipLabel, type.tabular, { color: c.textPrimary }]}>+{otherAllowed}</Text>
              </Chip>
            )}
            <Chip tinted onPress={manage && !canEditAllowed ? ratchet : addAllowed}>
              {manage && !canEditAllowed && <Ionicons name="lock-closed" size={12} color={c.accent} />}
              <Text style={[styles.chipLabel, { color: c.accent }]}>+ Add</Text>
            </Chip>
          </View>
          <Text style={[type.caption, styles.note, { color: c.textSecondary }]}>These apps never get locked.</Text>
        </SettingsGroup>

        <SettingsGroup label="Outside Pomodoro">
          <SettingsRow
            title="Quick block"
            value={
              <Text style={[styles.linkValue, { color: c.accent }]}>
                {quickBlock ? `Until ${formatClock(quickBlock.endAt)}` : 'Start'}
              </Text>
            }
            onPress={() => (quickBlock ? showSnackbar(`Quick block runs until ${formatClock(quickBlock.endAt)}`) : setQuickOpen(true))}
          />
          <GroupDivider />
          <SettingsRow
            title="Schedules"
            value={activeSchedules === 0 ? 'Off' : `${activeSchedules} active`}
            chevron
            onPress={() => router.push('/blocking/schedules')}
          />
        </SettingsGroup>

        {manage && (
          <View style={{ alignItems: 'center' }}>
            <DangerTextButton label="Turn off distraction blocking" onPress={() => setConfirmOff(true)} />
          </View>
        )}
      </View>
    </>
  );

  const sheets = (
    <>
      <QuickBlockSheet visible={quickOpen} onClose={() => setQuickOpen(false)} />
      {IS_ANDROID && <AllowedAppsSheet visible={allowedOpen} onClose={() => setAllowedOpen(false)} />}
      <Dialog
        visible={confirmOff}
        title="Turn off distraction blocking?"
        body="Your app choices are saved. You can turn it back on from the Focus tab."
        secondary={{
          label: 'Turn off',
          danger: true,
          onPress: () => {
            setConfirmOff(false);
            blocking.turnOff();
            exitToFocus(router);
          },
        }}
        onClose={() => setConfirmOff(false)}
      />
      {dialog}
    </>
  );

  if (!manage) {
    return (
      <SetupScreen
        header={<SetupTopBar step={steps.step} total={steps.total} onBack={back} />}
        footer={
          <PrimaryButton
            label="Finish setup"
            onPress={() => {
              blocking.finishSetup();
              router.push('/blocking/ready');
            }}
          />
        }
      >
        <Text style={[type.setupTitle, { color: c.textPrimary, marginTop: 8 }]}>Set your rules</Text>
        <Text style={[type.secondary, { color: c.textSecondary, marginTop: 8, marginBottom: 24 }]}>
          You can change these later.
        </Text>
        {content}
        {sheets}
      </SetupScreen>
    );
  }

  // Manage: the large title collapses into a compact glass bar over the first 48px of scroll.
  const barTitle = scrollY.interpolate({ inputRange: [24, 48], outputRange: [0, 1], extrapolate: 'clamp' });
  const barFill = scrollY.interpolate({ inputRange: [0, 48], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.manageBar}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            floatingShadow(isDark),
            { backgroundColor: glass, borderBottomWidth: 1, borderColor: c.glassBorder, opacity: barFill },
          ]}
        />
        <CircleIconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Back" />
        <Animated.Text style={[type.bodyStrong, { color: c.textPrimary, opacity: barTitle }]}>Blocking settings</Animated.Text>
      </View>
      <Animated.ScrollView
        contentContainerStyle={styles.manageContent}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        <Text style={[type.setupTitle, { color: c.textPrimary, marginBottom: 20 }]}>Blocking settings</Text>
        {content}
      </Animated.ScrollView>
      {sheets}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  note: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  chip: { height: 36, borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipLabel: { fontSize: 14, lineHeight: 18, fontWeight: '500' },
  focalystIcon: { width: 20, height: 20, borderRadius: 4.4 },
  linkValue: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  manageBar: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, zIndex: 2 },
  manageContent: { paddingHorizontal: 20, paddingBottom: 40 },
});
