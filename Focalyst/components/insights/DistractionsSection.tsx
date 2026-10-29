import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  REASON_LABELS,
  attemptsByTimeOfDay,
  avgMinutesToFirstAttempt,
  dailyAttempts,
  topApps,
  unlockReasons,
  type BlockingSessionRecord,
  type TimeOfDay,
  type UnlockReason,
} from '../../src/blocking/history';
import { BLOCKING_HISTORY_UPDATED, loadBlockingHistory } from '../../src/services/blockingTelemetrySync';
import { openPaywall } from '../../src/blocking/BlockingContext';
import { AppIcon } from '../blocking/AppIcon';

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGES = [7, 30] as const;
const TIMES: TimeOfDay[] = ['Morning', 'Afternoon', 'Evening', 'Night'];
const REASONS: UnlockReason[] = ['study', 'reply', 'bored', 'other'];

/**
 * Insights "Distractions": attempts over time, tempting apps, time of day, unlock reasons. Free
 * users get the attempt count and chart; the breakdowns are Pro.
 */
export default function DistractionsSection({ isDarkMode, isPro }: { isDarkMode: boolean; isPro: boolean }) {
  const [history, setHistory] = useState<BlockingSessionRecord[] | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);

  const load = useCallback(() => {
    loadBlockingHistory().then(setHistory);
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(BLOCKING_HISTORY_UPDATED, load);
    return () => sub.remove();
  }, [load]);

  const colors = {
    card: isDarkMode ? '#151B2E' : '#FFFFFF',
    // Same card treatment as the Weekly Report card below it.
    border: isDarkMode ? '#222A41' : '#cbd5e1',
    title: isDarkMode ? '#FFFFFF' : '#121C2A',
    sub: isDarkMode ? '#9AA0B4' : '#42474D',
    track: isDarkMode ? '#222A41' : '#EFF3FF',
    accent: isDarkMode ? '#EE7742' : '#315472',
  };

  if (!history) return null;

  const records = history.filter((r) => r.endedAt >= Date.now() - range * DAY_MS);
  const days = dailyAttempts(history, range);
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((a, d) => a + d.count, 0);
  const apps = topApps(records, 5);
  const times = attemptsByTimeOfDay(records);
  const maxTime = Math.max(1, ...Object.values(times));
  const reasons = unlockReasons(records);
  const reasonTotal = REASONS.reduce((a, k) => a + reasons[k], 0);
  const firstAttempt = avgMinutesToFirstAttempt(records);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.title }]}>Distractions</Text>
        <View style={[styles.toggle, { backgroundColor: colors.track }]}>
          {RANGES.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              accessibilityRole="button"
              accessibilityState={{ selected: range === r }}
              style={[styles.toggleItem, range === r && { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.toggleLabel, { color: range === r ? '#FFFFFF' : colors.sub }]}>{r} days</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {history.length === 0 ? (
        <Text style={[styles.body, { color: colors.sub }]}>
          Start a focus session with blocking on to see when distractions pull at you.
        </Text>
      ) : (
        <>
          <Text style={[styles.big, { color: colors.title }]}>{total}</Text>
          <Text style={[styles.body, { color: colors.sub }]}>blocked attempts in the last {range} days</Text>

          <View style={styles.chart}>
            {days.map((d) => (
              <View key={d.at} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(3, (d.count / maxDay) * 80),
                      backgroundColor: colors.accent,
                      opacity: d.count ? 0.85 : 0.2,
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          {!isPro ? (
            <Pressable
              onPress={openPaywall}
              accessibilityRole="button"
              style={({ pressed }) => [styles.upsell, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="lock-closed" size={18} color={colors.accent} />
              <Text style={[styles.body, { color: colors.title, flex: 1 }]}>
                See your most tempting apps, peak times and unlock reasons with Pro
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.sub} />
            </Pressable>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.sub }]}>MOST TEMPTING APPS</Text>
              {apps.length === 0 ? (
                <Text style={[styles.body, { color: colors.sub }]}>No attempts in this period.</Text>
              ) : (
                apps.map((a, i) => (
                  <View key={a.app} style={styles.row}>
                    {a.appKey ? (
                      <AppIcon packageName={a.appKey} size={24} />
                    ) : (
                      <Text style={[styles.value, { color: colors.sub, width: 24 }]}>{i + 1}.</Text>
                    )}
                    <Text style={[styles.body, { color: colors.title, flex: 1 }]} numberOfLines={1}>
                      {a.app}
                    </Text>
                    <Text style={[styles.value, { color: colors.sub }]}>
                      {a.count} {a.count === 1 ? 'try' : 'tries'}
                    </Text>
                  </View>
                ))
              )}

              <Text style={[styles.label, { color: colors.sub }]}>BY TIME OF DAY</Text>
              {TIMES.map((t) => (
                <View key={t} style={styles.row}>
                  <Text style={[styles.body, { color: colors.title, width: 90 }]}>{t}</Text>
                  <View style={[styles.meter, { backgroundColor: colors.track }]}>
                    <View style={[styles.meterFill, { width: `${(times[t] / maxTime) * 100}%`, backgroundColor: colors.accent }]} />
                  </View>
                  <Text style={[styles.value, { color: colors.sub, width: 32, textAlign: 'right' }]}>{times[t]}</Text>
                </View>
              ))}

              <Text style={[styles.label, { color: colors.sub }]}>UNLOCK REASONS</Text>
              {reasonTotal === 0 ? (
                <Text style={[styles.body, { color: colors.sub }]}>No unlocks in this period.</Text>
              ) : (
                REASONS.map((k) => (
                  <View key={k} style={styles.row}>
                    <Text style={[styles.body, { color: colors.title, flex: 1 }]}>{REASON_LABELS[k]}</Text>
                    <Text style={[styles.value, { color: colors.sub }]}>{reasons[k]}</Text>
                  </View>
                ))
              )}

              <View style={[styles.footer, { borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={18} color={colors.sub} />
                <Text style={[styles.body, { color: colors.sub, flex: 1 }]}>
                  {firstAttempt == null
                    ? 'No first-attempt data yet'
                    : `On average, the first attempt comes ${firstAttempt} min into a focus block`}
                </Text>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#4a6c8c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  toggle: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  toggleItem: { borderRadius: 10, paddingHorizontal: 10, height: 30, justifyContent: 'center' },
  toggleLabel: { fontSize: 13, lineHeight: 16, fontWeight: '600' },
  big: { fontSize: 28, lineHeight: 32, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
  body: { fontSize: 14, lineHeight: 20 },
  value: { fontSize: 14, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 84, gap: 2, marginTop: 16 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', maxWidth: 24, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  label: { fontSize: 13, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6, marginTop: 20, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  meter: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  meterFill: { height: 8, borderRadius: 4 },
  upsell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingTop: 14, borderTopWidth: 1 },
});
