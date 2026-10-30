import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppTokenLabelView } from '../../modules/screen-time-blocker';
import { cardShadow, type, useBlockingTheme } from '../../constants/blockingTheme';
import { openPaywall, useBlocking } from '../../src/blocking/BlockingContext';
import { FreeAppLimitBanner, upgradeLabel } from '../../components/blocking/FreeAppLimitBanner';
import { selectionLabel, selectionTotal } from '../../src/blocking/levels';
import { useLeaveSetup, useSetupSteps } from '../../src/blocking/setupNav';
import { SetupScreen } from '../../components/blocking/SetupScreen';
import { SetupTopBar } from '../../components/blocking/SetupTopBar';
import { CircleIconButton, PrimaryButton, SecondaryButton, TextButton } from '../../components/blocking/Buttons';
import { AndroidAppPicker } from '../../components/blocking/AndroidAppPicker';

const GRID_MAX = 6;

/** S4 (iOS). `?mode=edit` comes from Manage. */
function IosBlockingApps() {
  const { c, isDark } = useBlockingTheme();
  const router = useRouter();
  const steps = useSetupSteps('apps');
  const editMode = steps.mode === 'edit';
  const { back, dialog } = useLeaveSetup(!editMode && steps.isFirst);
  const { config, pickApps, showSnackbar, overFreeAppLimit } = useBlocking();
  const [busy, setBusy] = useState(false);

  const summary = config.blocklistSummary;
  const total = selectionTotal(summary);
  const gridCount = Math.min(summary.appCount, GRID_MAX);
  const more = summary.appCount - gridCount;

  const choose = async () => {
    setBusy(true);
    const result = await pickApps('blocklist');
    setBusy(false);
    if (!result.ok) showSnackbar(result.reason);
  };

  const next = () => {
    if (editMode) router.back();
    else router.push(`/blocking/level?${steps.carry}`);
  };

  return (
    <SetupScreen
      header={
        editMode ? (
          <View style={styles.appBar}>
            <CircleIconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Back" />
            <Text style={[type.cardTitle, { color: c.textPrimary }]}>Blocked apps</Text>
          </View>
        ) : (
          <SetupTopBar step={steps.step} total={steps.total} onBack={back} />
        )
      }
      footer={
        overFreeAppLimit ? (
          <PrimaryButton label={upgradeLabel(summary)} onPress={openPaywall} />
        ) : (
          <PrimaryButton
            label={editMode ? 'Save' : 'Continue'}
            onPress={next}
            disabled={total === 0}
            onDisabledPress={() => showSnackbar('Pick at least 1 app')}
          />
        )
      }
    >
      {!editMode && (
        <>
          <Text style={[type.setupTitle, { color: c.textPrimary, marginTop: 8 }]}>What pulls you away?</Text>
          <Text style={[type.secondary, { color: c.textSecondary, marginTop: 8 }]}>
            Pick specific apps. You can change this anytime.
          </Text>
        </>
      )}

      <View style={[styles.card, cardShadow(isDark), { backgroundColor: c.surface, borderColor: c.border }]}>
        {total === 0 ? (
          <>
            <Text style={[type.body, { color: c.textPrimary }]}>Choose the apps to lock during focus.</Text>
            <View style={styles.info}>
              <Ionicons name="information-circle-outline" size={20} color={c.textSecondary} />
              <Text style={[type.secondary, { color: c.textSecondary, flex: 1 }]}>
                Pick individual apps, not whole categories like Social, so useful apps stay open.
              </Text>
            </View>
            <PrimaryButton label="Choose apps" onPress={choose} loading={busy} style={{ marginTop: 16 }} />
          </>
        ) : (
          <>
            {gridCount > 0 && (
              <View style={styles.grid}>
                {Array.from({ length: gridCount }, (_, i) => (
                  <View key={i} style={styles.gridCell}>
                    <AppTokenLabelView
                      tokenIndex={i}
                      mode="blocklist"
                      size={40}
                      showTitle
                      colorScheme={isDark ? 'dark' : 'light'}
                      style={{ width: '100%' }}
                    />
                  </View>
                ))}
              </View>
            )}
            {more > 0 && (
              <Text style={[type.secondary, type.tabular, { color: c.textSecondary, marginTop: 8 }]}>+{more} more</Text>
            )}
            <View style={styles.summaryRow}>
              <Text style={[type.secondary, type.tabular, { color: c.textSecondary, flex: 1 }]}>
                {selectionLabel(summary)}
              </Text>
              <TextButton label="Change" onPress={choose} color={c.accent} disabled={busy} />
            </View>
          </>
        )}
      </View>

      {overFreeAppLimit && (
        <View style={{ marginTop: 16 }}>
          <FreeAppLimitBanner />
        </View>
      )}

      {editMode && total > 0 && (
        <SecondaryButton label="Choose apps" icon="apps-outline" onPress={choose} style={{ marginTop: 16 }} />
      )}
      {dialog}
    </SetupScreen>
  );
}

/** S4: the in-app picker on Android, Apple's picker on iOS. */
export default function BlockingApps() {
  return Platform.OS === 'android' ? <AndroidAppPicker /> : <IosBlockingApps />;
}

const styles = StyleSheet.create({
  appBar: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { marginTop: 24, borderRadius: 24, borderWidth: 1, padding: 20 },
  info: { flexDirection: 'row', gap: 8, marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  gridCell: { width: '50%', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
});
