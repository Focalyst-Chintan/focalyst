import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { openPaywall, useBlocking } from '../../src/blocking/BlockingContext';
import { newSchedule, type Schedule } from '../../src/blocking/schedules';
import { haptics } from '../../src/blocking/haptics';
import { SetupScreen } from '../../components/blocking/SetupScreen';
import { CircleIconButton, DangerTextButton, PrimaryButton } from '../../components/blocking/Buttons';
import { GroupDivider, SettingsGroup, SettingsRow, ToggleRow } from '../../components/blocking/Form';
import { LevelChip } from '../../components/blocking/Chips';
import { LevelOptions } from '../../components/blocking/StrictnessSheet';
import { Dialog } from '../../components/blocking/Overlays';
import { TimingCard } from '../../components/blocking/TimingCard';

/** S14 edit screen. `?id=` edits an existing schedule; no id creates one. */
export default function BlockingScheduleEdit() {
  const { c } = useBlockingTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { schedules, saveSchedule, deleteSchedule, showSnackbar, isPro } = useBlocking();
  const existing = useMemo(() => schedules.find((s) => s.id === id), [schedules, id]);
  const [draft, setDraft] = useState<Schedule>(() => existing ?? newSchedule(isPro ? 'firm' : 'gentle'));
  const [pickingLevel, setPickingLevel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = (patch: Partial<Schedule>) => setDraft((prev) => ({ ...prev, ...patch }));
  const noDays = !draft.onceDate && !draft.days.some(Boolean);
  const sameTimes = draft.startMin === draft.endMin;

  const save = () => {
    const result = saveSchedule({ ...draft, name: draft.name.trim() || 'Schedule' });
    if (!result.ok) {
      haptics.error();
      showSnackbar(result.reason);
      if (result.pro) openPaywall();
      return;
    }
    haptics.success();
    router.back();
  };

  return (
    <SetupScreen
      header={
        <View style={styles.appBar}>
          <CircleIconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Back" />
          <Text style={[type.cardTitle, { color: c.textPrimary }]}>{existing ? 'Edit schedule' : 'New schedule'}</Text>
        </View>
      }
      footer={
        <>
          <PrimaryButton
            label="Save"
            onPress={save}
            disabled={noDays || sameTimes}
            onDisabledPress={() => showSnackbar(noDays ? 'Pick at least 1 day' : 'Start and end must differ')}
          />
          {existing && <DangerTextButton label="Delete schedule" onPress={() => setConfirmDelete(true)} />}
        </>
      }
    >
      <Text style={[type.overline, { color: c.textSecondary, marginTop: 8 }]}>Name</Text>
      <TextInput
        value={draft.name}
        onChangeText={(name) => update({ name })}
        placeholder="Bedtime"
        placeholderTextColor={c.textTertiary}
        maxLength={40}
        returnKeyType="done"
        style={[styles.input, type.body, { backgroundColor: c.surface2, borderColor: c.border, color: c.textPrimary }]}
      />

      <Text style={[type.overline, { color: c.textSecondary, marginTop: 24, marginBottom: 8 }]}>Timing</Text>
      <TimingCard
        startMin={draft.startMin}
        endMin={draft.endMin}
        days={draft.days}
        onStartChange={(m) => update({ startMin: m ?? draft.startMin })}
        onEndChange={(endMin) => update({ endMin })}
        // Choosing days turns a one-off into a repeating schedule.
        onDaysChange={(days) => update({ days, onceDate: days.some(Boolean) ? undefined : draft.onceDate })}
      />
      {draft.endMin < draft.startMin && (
        <Text style={[type.caption, { color: c.textSecondary, marginTop: 8 }]}>Ends the next morning.</Text>
      )}

      <View style={{ marginTop: 24 }}>
        <SettingsGroup label="Blocking">
          {pickingLevel ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <LevelOptions
                value={draft.level}
                onSelect={(level) => {
                  update({ level });
                  setPickingLevel(false);
                }}
              />
            </View>
          ) : (
            <SettingsRow
              title="Strictness"
              value={<LevelChip level={draft.level} />}
              chevron
              onPress={() => setPickingLevel(true)}
            />
          )}
          <GroupDivider />
          <SettingsRow title="Apps" value="Same as focus" />
          <GroupDivider />
          <ToggleRow title="Schedule on" value={draft.enabled} onChange={(enabled) => update({ enabled })} />
          <Text style={[type.caption, styles.note, { color: c.textSecondary }]}>
            Runs on its own at these times, even when Focalyst is closed.
          </Text>
        </SettingsGroup>
      </View>

      <Dialog
        visible={confirmDelete}
        title="Delete this schedule?"
        body="It stops blocking and is removed from your schedules."
        secondary={{
          label: 'Delete',
          danger: true,
          onPress: () => {
            setConfirmDelete(false);
            const result = deleteSchedule(draft.id);
            if (!result.ok) return showSnackbar(result.reason);
            router.back();
          },
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </SetupScreen>
  );
}

const styles = StyleSheet.create({
  appBar: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { marginTop: 8, height: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16 },
  note: { paddingHorizontal: 20, paddingBottom: 12 },
});
