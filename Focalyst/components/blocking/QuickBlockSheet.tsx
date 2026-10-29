import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import type { StrictnessLevel } from '../../modules/screen-time-blocker';
import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { formatClock, selectionTotal } from '../../src/blocking/levels';
import { FREE_SESSION_MESSAGE, openPaywall, useBlocking } from '../../src/blocking/BlockingContext';
import { dayKey, minutesToClock } from '../../src/blocking/schedules';
import { haptics } from '../../src/blocking/haptics';
import { BottomSheet } from './Overlays';
import { PrimaryButton } from './Buttons';
import { LevelChip } from './Chips';
import { LevelOptions } from './StrictnessSheet';
import { FreeAppLimitBanner, upgradeLabel } from './FreeAppLimitBanner';
import { TimingCard, nowMinutes } from './TimingCard';

const PRESETS = [
  { id: '30', label: '30 min', minutes: 30 },
  { id: '60', label: '1 hr', minutes: 60 },
  { id: '120', label: '2 hr', minutes: 120 },
  { id: 'custom', label: 'Custom', minutes: 0 },
] as const;

type PresetId = (typeof PRESETS)[number]['id'];

const NO_DAYS = [false, false, false, false, false, false, false];
const DAY_MS = 24 * 60 * 60 * 1000;

/** 2.10 SegmentedControl. */
function Segmented({ value, onChange }: { value: PresetId; onChange: (id: PresetId) => void }) {
  const { c } = useBlockingTheme();
  return (
    <View style={[styles.track, { backgroundColor: c.surface2 }]}>
      {PRESETS.map((p) => {
        const selected = p.id === value;
        return (
          <Pressable
            key={p.id}
            onPress={() => {
              haptics.selection();
              onChange(p.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && { backgroundColor: c.selectedFill }]}
          >
            <Text
              style={[
                styles.segmentLabel,
                selected ? { color: c.onSelected, fontWeight: '600' } : { color: c.textSecondary, fontWeight: '500' },
              ]}
            >
              {p.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** S13c, with Start at / End at / Repeat. Starting later or repeating saves a schedule. */
export function QuickBlockSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useBlockingTheme();
  const router = useRouter();
  const {
    config,
    isPro,
    overFreeAppLimit,
    canAddBlockingSession,
    quickBlock,
    startQuickBlock,
    saveSchedule,
    showSnackbar,
  } = useBlocking();
  const [preset, setPreset] = useState<PresetId>('60');
  const [startMin, setStartMin] = useState<number | null>(null);
  const [endMin, setEndMin] = useState(() => (nowMinutes() + 60) % 1440);
  const [days, setDays] = useState<boolean[]>(NO_DAYS);
  const [level, setLevel] = useState<StrictnessLevel>(isPro ? config.level : 'gentle');
  const [pickingLevel, setPickingLevel] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLevel(isPro ? config.level : 'gentle');
    setPickingLevel(false);
    setPreset('60');
    setStartMin(null);
    setEndMin((nowMinutes() + 60) % 1440);
    setDays(NO_DAYS);
  }, [visible, config.level, isPro]);

  const selectPreset = (id: PresetId) => {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id)!;
    if (p.minutes > 0) setEndMin(((startMin ?? nowMinutes()) + p.minutes) % 1440);
  };

  const repeats = days.some(Boolean);
  const startsNow = startMin == null && !repeats;
  const startRef = startMin ?? nowMinutes();
  const spanMin = ((endMin - startRef + 1440) % 1440) || 1440;
  const hasApps = selectionTotal(config.blocklistSummary) > 0;

  const requirePro = (message?: string) => {
    if (message) showSnackbar(message);
    onClose();
    setTimeout(openPaywall, 300);
  };

  const start = async () => {
    if (!canAddBlockingSession && !(startsNow && quickBlock)) return requirePro(FREE_SESSION_MESSAGE);

    if (startsNow) {
      setBusy(true);
      const result = await startQuickBlock(spanMin, level);
      setBusy(false);
      if (result === 'limit') return requirePro(FREE_SESSION_MESSAGE);
      if (result === 'permission') {
        onClose();
        return router.push('/blocking/permission?mode=fix');
      }
      if (result === 'failed') return showSnackbar("Quick block couldn't start");
      haptics.success();
      showSnackbar(`Quick block on until ${formatClock(Date.now() + spanMin * 60_000)}`);
      return onClose();
    }

    // Later today (or tomorrow if that time has passed), or on repeat days: save as a schedule.
    const startAt = startRef;
    const onceDay = startAt > nowMinutes() ? new Date() : new Date(Date.now() + DAY_MS);
    const result = saveSchedule({
      id: `sched_${Date.now()}`,
      name: 'Quick block',
      days,
      startMin: startAt,
      endMin,
      level,
      enabled: true,
      onceDate: repeats ? undefined : dayKey(onceDay),
    });
    if (!result.ok) {
      if (result.pro) return requirePro(result.reason);
      return showSnackbar(result.reason);
    }
    haptics.success();
    showSnackbar(repeats ? 'Schedule saved' : `Blocking starts at ${minutesToClock(startAt)}`);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
        <Text style={[type.cardTitle, { color: c.textPrimary }]}>Quick block</Text>
        <Text style={[type.secondary, { color: c.textSecondary, marginTop: 4, marginBottom: 16 }]}>
          Lock your apps without a timer.
        </Text>

        {pickingLevel ? (
          <LevelOptions
            value={level}
            onRequirePro={() => requirePro()}
            onSelect={(l) => {
              setLevel(l);
              setPickingLevel(false);
            }}
          />
        ) : (
          <>
            <Segmented value={preset} onChange={selectPreset} />
            <View style={{ marginTop: 16 }}>
              <TimingCard
                allowNow
                startMin={startMin}
                endMin={endMin}
                days={days}
                onStartChange={(m) => {
                  setStartMin(m);
                  const p = PRESETS.find((x) => x.id === preset)!;
                  if (p.minutes > 0) setEndMin(((m ?? nowMinutes()) + p.minutes) % 1440);
                }}
                onEndChange={(m) => {
                  setEndMin(m);
                  setPreset('custom');
                }}
                onDaysChange={setDays}
              />
            </View>

            <Pressable
              onPress={() => setPickingLevel(true)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.levelRow, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.levelLabel, { color: c.textPrimary }]}>Strictness</Text>
              <View style={styles.levelValue}>
                <LevelChip level={level} />
                <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
              </View>
            </Pressable>

            {overFreeAppLimit && (
              <View style={{ marginTop: 16 }}>
                <FreeAppLimitBanner />
              </View>
            )}

            {overFreeAppLimit ? (
              <PrimaryButton
                label={upgradeLabel(config.blocklistSummary)}
                onPress={() => requirePro()}
                style={{ marginTop: 16 }}
              />
            ) : (
              <PrimaryButton
                label={startsNow ? 'Start quick block' : repeats ? 'Save schedule' : `Start at ${minutesToClock(startRef)}`}
                onPress={start}
                loading={busy}
                disabled={!hasApps}
                onDisabledPress={() => showSnackbar('Pick at least 1 app')}
                style={{ marginTop: 16 }}
              />
            )}
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  segment: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentLabel: { fontSize: 15, lineHeight: 20 },
  levelRow: {
    marginTop: 16,
    height: 56,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  levelLabel: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  levelValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
});
