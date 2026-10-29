import React, { useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { cardShadow, type, useBlockingTheme } from '../../constants/blockingTheme';
import { useBlocking } from '../../src/blocking/BlockingContext';
import { requestNotificationPermission } from '../../src/blocking/notifications';
import { haptics } from '../../src/blocking/haptics';
import { useLeaveSetup, useSetupSteps } from '../../src/blocking/setupNav';
import { SetupScreen } from '../../components/blocking/SetupScreen';
import { SetupTopBar } from '../../components/blocking/SetupTopBar';
import { CircleIconButton, PrimaryButton, TextButton } from '../../components/blocking/Buttons';
import { GroupDivider, IconCircle } from '../../components/blocking/Form';
import { AndroidPermission } from '../../components/blocking/AndroidPermission';

const TRUST_ROWS = [
  { icon: 'lock-closed-outline', label: 'Your app usage stays on this phone' },
  { icon: 'eye-off-outline', label: "Focalyst can't see your messages or what you do inside apps" },
  { icon: 'options-outline', label: 'You can turn this off anytime in Settings' },
] as const;

/** S3 (iOS). `?mode=fix` comes from S1 state D. */
function IosBlockingPermission() {
  const { c, isDark } = useBlockingTheme();
  const router = useRouter();
  const steps = useSetupSteps('permission');
  const fixMode = steps.mode === 'fix';
  const { back, dialog } = useLeaveSetup(!fixMode && steps.isFirst);
  const { requestPermission, refreshPermission, draft } = useBlocking();
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  const proceed = () => {
    if (fixMode) router.back();
    else router.push(`/blocking/apps?${steps.carry}`);
  };

  const request = async () => {
    setBusy(true);
    try {
      const current = await refreshPermission();
      const result = current === 'approved' ? 'approved' : await requestPermission();
      if (result !== 'approved') {
        haptics.error();
        setDenied(true);
        return;
      }
      setDenied(false);
      if (draft.notifyLockUnlock) await requestNotificationPermission();
      proceed();
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
        denied ? (
          <>
            <PrimaryButton label="Try again" onPress={request} loading={busy} />
            <TextButton label="Open Settings" onPress={() => Linking.openSettings()} />
          </>
        ) : (
          <PrimaryButton label={fixMode ? 'Done' : 'Continue'} onPress={request} loading={busy} />
        )
      }
    >
      <View style={{ marginTop: 24 }}>
        <IconCircle icon="shield-half-outline" size={56} />
      </View>
      <Text style={[type.setupTitle, { color: c.textPrimary, marginTop: 20 }]}>Allow Screen Time access</Text>
      <Text style={[type.body, { color: c.textSecondary, marginTop: 8 }]}>
        Focalyst needs this to lock apps during focus. Your iPhone will ask you to confirm next.
      </Text>

      <View style={[styles.card, cardShadow(isDark), { backgroundColor: c.surface, borderColor: c.border }]}>
        {TRUST_ROWS.map((row, i) => (
          <React.Fragment key={row.label}>
            {i > 0 && <GroupDivider />}
            <View style={styles.trustRow}>
              <Ionicons name={row.icon} size={20} color={c.accent} />
              <Text style={[type.body, { color: c.textPrimary, flex: 1 }]}>{row.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {denied && (
        <View style={[styles.error, { backgroundColor: c.surface, borderColor: c.danger }]}>
          <Ionicons name="alert-circle-outline" size={20} color={c.danger} />
          <Text style={[type.body, { color: c.textPrimary, flex: 1 }]}>
            Access wasn't allowed. Blocking can't work without it.
          </Text>
        </View>
      )}
      {dialog}
    </SetupScreen>
  );
}

/** S3: two Android permissions, or Screen Time access on iOS. */
export default function BlockingPermission() {
  return Platform.OS === 'android' ? <AndroidPermission /> : <IosBlockingPermission />;
}

const styles = StyleSheet.create({
  fixBar: { height: 56, justifyContent: 'center' },
  card: { marginTop: 24, borderRadius: 24, borderWidth: 1, paddingVertical: 4 },
  trustRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 8 },
  error: {
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
