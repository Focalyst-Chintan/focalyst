import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { cardShadow, type, useBlockingTheme } from '../../constants/blockingTheme';
import { FREE_SESSION_MESSAGE, openPaywall, useBlocking } from '../../src/blocking/BlockingContext';
import { formatScheduleLine } from '../../src/blocking/schedules';
import { haptics } from '../../src/blocking/haptics';
import { SetupScreen } from '../../components/blocking/SetupScreen';
import { CircleIconButton, PrimaryButton } from '../../components/blocking/Buttons';
import { LevelChip } from '../../components/blocking/Chips';

/** S14 list. */
export default function BlockingSchedules() {
  const { c, isDark } = useBlockingTheme();
  const router = useRouter();
  const { schedules, saveSchedule, isScheduleRunning, showSnackbar, canAddBlockingSession } = useBlocking();

  const addSchedule = () => {
    if (canAddBlockingSession) return router.push('/blocking/schedule-edit');
    showSnackbar(FREE_SESSION_MESSAGE);
    openPaywall();
  };

  return (
    <SetupScreen
      header={
        <View style={styles.appBar}>
          <CircleIconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Back" />
        </View>
      }
      footer={<PrimaryButton label="New schedule" icon="add" onPress={addSchedule} />}
    >
      <Text style={[type.setupTitle, { color: c.textPrimary }]}>Schedules</Text>
      <Text style={[type.secondary, { color: c.textSecondary, marginTop: 8, marginBottom: 20 }]}>
        Lock your apps at set times, without a timer.
      </Text>

      {schedules.length === 0 ? (
        <View style={[styles.empty, { borderColor: c.border }]}>
          <Ionicons name="calendar-outline" size={24} color={c.textSecondary} />
          <Text style={[type.body, { color: c.textSecondary, textAlign: 'center' }]}>
            No schedules yet. Add one for bedtime, class, or deep work.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {schedules.map((s) => {
            const running = isScheduleRunning(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/blocking/schedule-edit?id=${s.id}`)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.card,
                  cardShadow(isDark),
                  { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.titleRow}>
                    <Text style={[type.bodyStrong, { color: c.textPrimary }]}>{s.name}</Text>
                    {running && (
                      <View style={[styles.runningDot, { backgroundColor: c.success }]} accessibilityLabel="Running now" />
                    )}
                  </View>
                  <Text style={[type.secondary, type.tabular, { color: c.textSecondary }]}>{formatScheduleLine(s)}</Text>
                  <View style={{ marginTop: 4 }}>
                    <LevelChip level={s.level} />
                  </View>
                </View>
                <Switch
                  value={s.enabled}
                  onValueChange={(enabled) => {
                    const result = saveSchedule({ ...s, enabled });
                    if (!result.ok) {
                      haptics.error();
                      showSnackbar(result.reason);
                      if (result.pro) openPaywall();
                      return;
                    }
                    haptics.selection();
                  }}
                  trackColor={{ false: isDark ? '#222D47' : '#cbd5e1', true: c.accent }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel={`${s.name} on`}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </SetupScreen>
  );
}

const styles = StyleSheet.create({
  appBar: { height: 56, justifyContent: 'center' },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 24, padding: 24, alignItems: 'center', gap: 12 },
  card: { borderRadius: 24, borderWidth: 1, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  runningDot: { width: 8, height: 8, borderRadius: 4 },
});
