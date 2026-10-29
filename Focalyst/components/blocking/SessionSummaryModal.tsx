import React, { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { cardShadow, type, useBlockingTheme, useReduceMotion } from '../../constants/blockingTheme';
import {
  patternInsight,
  topApps,
  unlockReasonsLine,
  weeklyAttempts,
  type BlockingSessionRecord,
} from '../../src/blocking/history';
import { loadBlockingHistory } from '../../src/services/blockingTelemetrySync';
import { haptics } from '../../src/blocking/haptics';
import { openPaywall, useBlocking } from '../../src/blocking/BlockingContext';
import { ProgressRing, RING_SIZES } from './ProgressRing';
import { PrimaryButton, SecondaryButton, TextButton } from './Buttons';
import { AppIcon } from './AppIcon';

type IconName = ComponentProps<typeof Ionicons>['name'];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BAR_MAX = 96;

/** Counts up from 0 (600 ms, ease-out) after `delay`. */
function useCountUp(target: number, delay: number) {
  const reduceMotion = useReduceMotion();
  const [value, setValue] = useState(reduceMotion ? target : 0);
  useEffect(() => {
    if (reduceMotion) return setValue(target);
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: v }) => setValue(Math.round(v)));
    Animated.timing(anim, {
      toValue: target,
      duration: 600,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [target, delay, reduceMotion]);
  return value;
}

function StatTile({
  value,
  label,
  icon,
  index,
}: {
  value: React.ReactNode;
  label: string;
  icon: IconName;
  index: number;
}) {
  const { c, isDark } = useBlockingTheme();
  return (
    <View style={[styles.tile, cardShadow(isDark), { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.tileTop}>
        {typeof value === 'number' ? <CountValue value={value} index={index} /> : value}
        <Ionicons name={icon} size={20} color={c.textSecondary} />
      </View>
      <Text style={[type.secondary, { color: c.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function CountValue({ value, index }: { value: number; index: number }) {
  const { c } = useBlockingTheme();
  const shown = useCountUp(value, 80 * index + 900);
  return <Text style={[type.statNumber, { color: c.textPrimary }]}>{shown}</Text>;
}

/** Free plan: where the weekly chart and pattern card would be. */
function ProTeaser() {
  const { c, isDark } = useBlockingTheme();
  return (
    <View style={[styles.card, cardShadow(isDark), { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.insightHead}>
        <Ionicons name="bar-chart-outline" size={20} color={c.accent} />
        <Text style={[type.bodyStrong, { color: c.textPrimary, flex: 1 }]}>Your week and your patterns</Text>
      </View>
      <Text style={[type.secondary, { color: c.textSecondary, marginTop: 8 }]}>
        See blocked attempts day by day and what keeps pulling you away with Focalyst Pro.
      </Text>
      <SecondaryButton
        label="Unlock with Pro"
        icon="lock-closed-outline"
        onPress={openPaywall}
        style={{ marginTop: 16 }}
      />
    </View>
  );
}

/** S12. Shown after a Pomodoro (or a standalone quick block) with blocking ends. */
export function SessionSummaryModal({
  record,
  onStartNext,
  onViewInsights,
  onClose,
}: {
  record: BlockingSessionRecord;
  onStartNext: () => void;
  onViewInsights: () => void;
  onClose: () => void;
}) {
  const { c, isDark } = useBlockingTheme();
  const { isPro } = useBlocking();
  const quick = record.kind === 'quick';
  const [history, setHistory] = useState<BlockingSessionRecord[]>([record]);
  const insightFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    haptics.success();
    // The record is saved asynchronously; merge it in case the load wins the race.
    loadBlockingHistory().then((h) => setHistory([...h.filter((r) => r.id !== record.id), record]));
    Animated.timing(insightFade, {
      toValue: 1,
      duration: 250,
      delay: 1400,
      useNativeDriver: true,
    }).start();
  }, [record, insightFade]);

  const week = weeklyAttempts(history);
  const maxBar = Math.max(1, ...week.days);
  const insight = patternInsight(history);
  const top = topApps([record], 1)[0];
  const reasons = unlockReasonsLine(record);
  const change =
    week.hasLastWeek && week.lastWeek > 0 ? Math.round(((week.thisWeek - week.lastWeek) / week.lastWeek) * 100) : null;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: c.bg }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <ProgressRing {...RING_SIZES.summary} progress={1} animateIn>
              <Ionicons name="checkmark" size={36} color={c.accent} />
            </ProgressRing>
            <Text style={[type.overline, { color: c.textSecondary, marginTop: 12 }]}>Session complete</Text>
            <Text style={[type.setupTitle, styles.center, { color: c.textPrimary, marginTop: 4 }]}>
              {record.focusMinutes} {record.focusMinutes === 1 ? 'minute' : 'minutes'} of focus
            </Text>
            {record.endedEarly && (
              <Text style={[type.secondary, styles.center, { color: c.textSecondary, marginTop: 4 }]}>
                {quick ? 'Quick block ended early' : `Ended after set ${record.completedSets} of ${record.plannedSets}`}
              </Text>
            )}
            <Text style={[type.secondary, type.tabular, styles.center, { color: c.textSecondary, marginTop: 4 }]}>
              {quick ? 'Quick block' : `${record.completedSets} of ${record.plannedSets} sets`} · {record.attemptsCount}{' '}
              {record.attemptsCount === 1 ? 'attempt' : 'attempts'} blocked
            </Text>
          </View>

          <View style={styles.grid}>
            {quick ? (
              <StatTile index={0} icon="timer-outline" label="minutes blocked" value={record.focusMinutes} />
            ) : (
              <StatTile
                index={0}
                icon="timer-outline"
                label="sets completed"
                value={
                  <Text style={[type.statNumber, { color: c.textPrimary }]}>
                    {record.completedSets}/{record.plannedSets}
                  </Text>
                }
              />
            )}
            <StatTile index={1} icon="shield-half-outline" label="attempts blocked" value={record.attemptsCount} />
            <StatTile
              index={2}
              icon="lock-open-outline"
              label={record.unlocksCount === 1 ? 'unlock used' : 'unlocks used'}
              value={record.unlocksCount}
            />
            <StatTile
              index={3}
              icon="flame-outline"
              label={top ? `${top.app} · ${top.count} ${top.count === 1 ? 'try' : 'tries'}` : 'Clean session'}
              value={
                top?.appKey ? (
                  <AppIcon packageName={top.appKey} size={28} />
                ) : top ? (
                  top.count
                ) : (
                  <Text style={[type.statNumber, { color: c.textPrimary }]}>0</Text>
                )
              }
            />
          </View>

          {!isPro && <ProTeaser />}

          {isPro && (
            <View style={[styles.card, cardShadow(isDark), { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[type.bodyStrong, { color: c.textPrimary }]}>Blocked attempts this week</Text>
              <View style={styles.chart}>
                {week.days.map((count, i) => {
                  const future = i > week.todayIndex;
                  const today = i === week.todayIndex;
                  return (
                    <View key={i} style={styles.barCol}>
                      {!future && <Text style={[type.caption, type.tabular, { color: c.textSecondary }]}>{count}</Text>}
                      {!future && (
                        <View
                          style={[
                            styles.bar,
                            {
                              height: Math.max(4, (count / maxBar) * BAR_MAX),
                              backgroundColor: c.accent,
                              opacity: today ? 1 : 0.45,
                            },
                          ]}
                        />
                      )}
                      <Text
                        style={[
                          type.caption,
                          { marginTop: 6 },
                          today
                            ? { color: c.textPrimary, fontWeight: '700' }
                            : {
                                color: future ? c.textTertiary : c.textSecondary,
                              },
                        ]}
                      >
                        {DAY_LABELS[i]}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {change != null && change !== 0 && (
                <View style={styles.trend}>
                  <Ionicons
                    name={change < 0 ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={change < 0 ? c.success : c.textSecondary}
                  />
                  <Text style={[type.secondary, { color: change < 0 ? c.success : c.textSecondary }]}>
                    {change < 0 ? 'Down' : 'Up'} {Math.abs(change)}% from last week
                  </Text>
                </View>
              )}
            </View>
          )}

          {reasons && <Text style={[type.caption, { color: c.textSecondary, marginTop: 12 }]}>{reasons}</Text>}

          {isPro && insight && (
            <Animated.View
              style={[
                styles.card,
                cardShadow(isDark),
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  opacity: insightFade,
                },
              ]}
            >
              <View style={styles.insightHead}>
                <Ionicons name="bulb-outline" size={20} color={c.accent} />
                <Text style={[type.overline, { color: c.textSecondary }]}>Pattern</Text>
              </View>
              <Text style={[type.body, { color: c.textPrimary, marginTop: 8 }]}>{insight}</Text>
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton label="Start next session" onPress={onStartNext} />
          <TextButton label="View in Insights" onPress={onViewInsights} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  center: { textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 },
  tile: {
    width: '47.8%',
    flexGrow: 1,
    height: 104,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  card: { marginTop: 20, borderRadius: 24, borderWidth: 1, padding: 20 },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
    height: BAR_MAX + 48,
  },
  barCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 32,
    gap: 4,
  },
  bar: { width: 24, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  insightHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 4 },
});
