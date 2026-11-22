import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from 'react-native-svg';

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
import { SegmentedToggle } from '../ui/SegmentedToggle';

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
  const [cardSize, setCardSize] = useState({ width: 350, height: 112 });

  const handleCardLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (
      width > 0 &&
      height > 0 &&
      (Math.abs(width - cardSize.width) > 1 || Math.abs(height - cardSize.height) > 1)
    ) {
      setCardSize({ width, height });
    }
  };

  const load = useCallback(() => {
    loadBlockingHistory().then(setHistory);
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(BLOCKING_HISTORY_UPDATED, load);
    return () => sub.remove();
  }, [load]);

  const colors = {
    card: isDarkMode ? '#0A0905' : '#B45309',
    border: isDarkMode ? 'rgba(234, 179, 8, 0.34)' : 'rgba(254, 240, 138, 0.50)',
    title: '#FFFFFF',
    sub: isDarkMode ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.88)',
    track: isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.22)',
    accent: isDarkMode ? '#EAB308' : '#FFFFFF',
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
    <View
      onLayout={handleCardLayout}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Base obsidian-charcoal (Dark) / rich golden-amber jewel-tone (Light) surface */}
      <LinearGradient
        colors={
          isDarkMode
            ? ['#0A0905', '#100E07', '#161308']
            : ['#92400E', '#B45309', '#D97706', '#F59E0B']
        }
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Full-bleed bottom-center golden-yellow radial glow + specular rim highlight */}
      <Svg
        width={cardSize.width}
        height={cardSize.height}
        viewBox={`0 0 ${cardSize.width} ${cardSize.height}`}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          {isDarkMode ? (
            <RadialGradient id="distractionGoldGlow" cx="50%" cy="102%" rx="72%" ry="58%">
              <Stop offset="0%" stopColor="#EAB308" stopOpacity="0.55" />
              <Stop offset="35%" stopColor="#CA8A04" stopOpacity="0.33" />
              <Stop offset="68%" stopColor="#A16207" stopOpacity="0.14" />
              <Stop offset="100%" stopColor="#0A0905" stopOpacity="0" />
            </RadialGradient>
          ) : (
            <RadialGradient id="distractionGoldGlow" cx="50%" cy="102%" rx="72%" ry="58%">
              <Stop offset="0%" stopColor="#FEF08A" stopOpacity="0.52" />
              <Stop offset="38%" stopColor="#FDE68A" stopOpacity="0.30" />
              <Stop offset="72%" stopColor="#F59E0B" stopOpacity="0" />
            </RadialGradient>
          )}

          <SvgLinearGradient id="distractionBottomRim" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop
              offset="0%"
              stopColor={isDarkMode ? '#A16207' : '#FDE68A'}
              stopOpacity={0}
            />
            <Stop
              offset="25%"
              stopColor={isDarkMode ? '#EAB308' : '#FEF08A'}
              stopOpacity={isDarkMode ? 0.48 : 0.55}
            />
            <Stop
              offset="50%"
              stopColor={isDarkMode ? '#FEF08A' : '#FEFCE8'}
              stopOpacity={isDarkMode ? 0.9 : 0.92}
            />
            <Stop
              offset="75%"
              stopColor={isDarkMode ? '#EAB308' : '#FEF08A'}
              stopOpacity={isDarkMode ? 0.48 : 0.55}
            />
            <Stop
              offset="100%"
              stopColor={isDarkMode ? '#A16207' : '#FDE68A'}
              stopOpacity={0}
            />
          </SvgLinearGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={cardSize.width}
          height={cardSize.height}
          fill="url(#distractionGoldGlow)"
        />
        <Rect
          x={0}
          y={cardSize.height - 3}
          width={cardSize.width}
          height={3}
          fill="url(#distractionBottomRim)"
        />
      </Svg>

      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.title }]}>Distraction Block</Text>
        <SegmentedToggle
          size="compact"
          isDarkMode={isDarkMode}
          activeValue={range}
          onChange={(r) => setRange(r as 7 | 30)}
          trackBgColor={isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.18)'}
          trackBorderColor={isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.28)'}
          activePillColor={isDarkMode ? 'rgba(234, 179, 8, 0.28)' : '#FFFFFF'}
          activePillBorderColor={isDarkMode ? 'rgba(253, 224, 71, 0.55)' : 'transparent'}
          activePillBorderWidth={isDarkMode ? 1 : 0}
          activeTextColorOverride={isDarkMode ? '#FFFFFF' : '#B45309'}
          inactiveTextColorOverride={isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.86)'}
          options={[
            { label: '7 days', value: 7 },
            { label: '30 days', value: 30, locked: !isPro },
          ]}
        />
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
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0A1530',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
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
