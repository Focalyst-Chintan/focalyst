import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import {
  ARCHETYPE_META,
  type WrappedPayload,
} from '../../services/wrappedService';
import {
  WRAPPED_CANVAS_BG,
  WRAPPED_POSTER_THEMES,
  getVictoryPosterTheme,
  type WrappedCardKind,
} from './wrappedThemes';
import { WrappedGradientCanvas } from './WrappedGradientCanvas';

interface WrappedCardViewProps {
  kind: WrappedCardKind;
  payload: WrappedPayload;
  animateKey?: string | number;
  forceComplete?: boolean;
}

const FONT_SERIF = 'InstrumentSerif_400Regular';
const FONT_SERIF_ITALIC = 'InstrumentSerif_400Regular_Italic';
const FONT_SANS_MED = 'Inter_500Medium';
const FONT_SANS_SEMI = 'Inter_600SemiBold';
const FONT_SANS_BOLD = 'Inter_700Bold';
const FONT_SANS_EXTRA = 'Inter_800ExtraBold';

function useAnimatedCounter(
  target: number,
  animateKey: string | number | undefined,
  forceComplete: boolean,
  delayMs = 120,
  durationMs = 950
): number {
  const [display, setDisplay] = useState(forceComplete ? target : 0);

  useEffect(() => {
    if (forceComplete) {
      setDisplay(target);
      return;
    }

    setDisplay(0);
    let rafId: number | null = null;
    let startTime: number | null = null;

    const timer = setTimeout(() => {
      const step = (ts: number) => {
        if (startTime === null) startTime = ts;
        const elapsed = ts - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(target * eased));
        if (t < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          setDisplay(target);
        }
      };
      rafId = requestAnimationFrame(step);
    }, delayMs);

    return () => {
      clearTimeout(timer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [target, animateKey, forceComplete, delayMs, durationMs]);

  return display;
}

function formatShortDate(ymd: string | null | undefined): string {
  if (!ymd) return '—';
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return ymd;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatDurationMinutes(totalMinutes: number): { primary: string; secondary: string } {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hrs === 0) {
    return { primary: `${mins}m`, secondary: 'of unbroken focus' };
  }
  return {
    primary: `${hrs.toLocaleString('en-US')}h ${String(mins).padStart(2, '0')}m`,
    secondary: `${totalMinutes.toLocaleString('en-US')} total minutes in the zone`,
  };
}

function formatAudioDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function getCardEyebrow(kind: WrappedCardKind, payload: WrappedPayload): string {
  switch (kind) {
    case 'intro':
      return 'ANNUAL EDITION';
    case 'focus':
      return 'DEEP FOCUS';
    case 'tasks':
      return 'EXECUTION';
    case 'habits':
      return 'CONSISTENCY';
    case 'voice_ai': {
      const hasVoice = payload.voice.totalWords > 0 || payload.voice.notesCount > 0;
      const hasAi = payload.ai.totalPrompts > 0;
      return hasVoice && hasAi ? 'VOICE & AI' : hasVoice ? 'VOICE NOTES' : 'FOCALYST AI';
    }
    case 'blocker':
      return 'FOCUS SHIELD';
    case 'victory':
      return (ARCHETYPE_META[payload.archetypeKey] || ARCHETYPE_META.rhythm_weaver).eyebrow;
  }
}

export const WrappedCardView: React.FC<WrappedCardViewProps> = ({
  kind,
  payload,
  animateKey,
  forceComplete = false,
}) => {
  const theme =
    kind === 'victory'
      ? getVictoryPosterTheme(payload.archetypeKey)
      : WRAPPED_POSTER_THEMES[kind];

  const archetype = ARCHETYPE_META[payload.archetypeKey] || ARCHETYPE_META.rhythm_weaver;
  const eyebrow = getCardEyebrow(kind, payload);

  const beat1 = useRef(new Animated.Value(forceComplete ? 1 : 0)).current;
  const beat2 = useRef(new Animated.Value(forceComplete ? 1 : 0)).current;
  const beat3 = useRef(new Animated.Value(forceComplete ? 1 : 0)).current;
  const beat4 = useRef(new Animated.Value(forceComplete ? 1 : 0)).current;

  useEffect(() => {
    if (forceComplete) {
      beat1.setValue(1);
      beat2.setValue(1);
      beat3.setValue(1);
      beat4.setValue(1);
      return;
    }

    beat1.setValue(0);
    beat2.setValue(0);
    beat3.setValue(0);
    beat4.setValue(0);

    const anim = Animated.parallel([
      Animated.timing(beat1, {
        toValue: 1,
        duration: 320,
        delay: 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(beat2, {
        toValue: 1,
        duration: 480,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(beat3, {
        toValue: 1,
        duration: 440,
        delay: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(beat4, {
        toValue: 1,
        duration: 440,
        delay: 1150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    anim.start();
    return () => anim.stop();
  }, [animateKey, forceComplete, beat1, beat2, beat3, beat4]);

  const beat1Style = {
    opacity: beat1,
    transform: [{ translateY: beat1.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  };
  const beat2Style = {
    opacity: beat2,
    transform: [{ translateY: beat2.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };
  const beat3Style = {
    opacity: beat3,
    transform: [{ translateY: beat3.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  };
  const beat4Style = {
    opacity: beat4,
    transform: [{ translateY: beat4.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };

  const focusCount = useAnimatedCounter(payload.focus.totalMinutes, animateKey, forceComplete);
  const tasksCount = useAnimatedCounter(payload.tasks.completedCount, animateKey, forceComplete);
  const streakCount = useAnimatedCounter(payload.habits.longestStreak, animateKey, forceComplete);
  const hasVoice = payload.voice.totalWords > 0 || payload.voice.notesCount > 0;
  const hasAi = payload.ai.totalPrompts > 0;
  const voiceOrAiTarget = hasVoice ? payload.voice.totalWords : payload.ai.totalPrompts;
  const voiceOrAiCount = useAnimatedCounter(voiceOrAiTarget, animateKey, forceComplete);
  const blockerCount = useAnimatedCounter(payload.blocker.deflectedAttempts, animateKey, forceComplete);

  return (
    <View style={[styles.cardRoot, { backgroundColor: theme.baseBg || WRAPPED_CANVAS_BG }]}>
      <WrappedGradientCanvas theme={theme} idPrefix={`${kind}-${payload.year}`} />

      <View style={styles.posterFrame}>
        {/* Lineless Editorial Poster Top Metadata */}
        <View style={styles.posterTopMeta}>
          <Text style={styles.microLabel}>PRODUCTIVITY AUDIT</Text>
          <Text style={[styles.microLabel, { color: theme.accentColor }]}>{eyebrow}</Text>
        </View>

        {/* Main Editorial Body */}
        <View style={styles.posterBody}>
          {kind === 'intro' && (
            <View style={styles.introBlock}>
              <Animated.View style={beat1Style}>
                <Text style={styles.microLabel}>YOUR ANNUAL RECEIPTS</Text>
              </Animated.View>

              <Animated.View style={beat2Style}>
                <Text style={styles.introYearNum}>{payload.year}</Text>
                <Text style={styles.introSerifTitle}>Your Year{'\n'}in Review</Text>
              </Animated.View>

              <Animated.View style={beat3Style}>
                <Text style={styles.punchlineCopy}>
                  No pressure, just your entire year in receipts.
                </Text>
              </Animated.View>

              <Animated.View style={[styles.secondaryStatsBlock, beat4Style]}>
                <View style={styles.statsRow}>
                  <View style={styles.statCol}>
                    <Text style={styles.microLabel}>COHORT STANDING</Text>
                    <Text style={[styles.editorialValue, { color: theme.accentColor }]}>
                      {payload.ranking.percentileLabel}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.microLabel}>TIMEZONE</Text>
                    <Text style={styles.editorialValue} numberOfLines={1}>
                      {payload.timezone}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </View>
          )}

          {kind === 'focus' && (() => {
            const formatted = formatDurationMinutes(focusCount);
            return (
              <View style={styles.metricBlock}>
                <Animated.View style={beat1Style}>
                  <Text style={styles.microLabel}>TIME INVESTED IN DEEP WORK</Text>
                </Animated.View>

                <Animated.View style={beat2Style}>
                  <Text style={styles.heroMetric} adjustsFontSizeToFit numberOfLines={1}>
                    {formatted.primary}
                  </Text>
                  <Text style={styles.serifNarrative}>{formatted.secondary}.</Text>
                </Animated.View>

                <Animated.View style={beat3Style}>
                  <Text style={[styles.punchlineCopy, { color: theme.accentColor }]}>
                    Where did you even find the time?
                  </Text>
                </Animated.View>

                <Animated.View style={[styles.secondaryStatsBlock, beat4Style]}>
                  <View style={styles.statsRow}>
                    <View style={styles.statCol}>
                      <Text style={styles.microLabel}>SESSIONS</Text>
                      <Text style={styles.editorialValue}>
                        {payload.focus.sessionsCount.toLocaleString('en-US')}
                      </Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={styles.microLabel}>PEAK DAY</Text>
                      <Text style={styles.editorialValue}>
                        {payload.focus.peakDay
                          ? `${formatShortDate(payload.focus.peakDay.date)} · ${payload.focus.peakDay.minutes}m`
                          : '—'}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              </View>
            );
          })()}

          {kind === 'tasks' && (
            <View style={styles.metricBlock}>
              <Animated.View style={beat1Style}>
                <Text style={styles.microLabel}>COMMITMENTS CLOSED</Text>
              </Animated.View>

              <Animated.View style={beat2Style}>
                <Text style={styles.heroMetric} adjustsFontSizeToFit numberOfLines={1}>
                  {tasksCount.toLocaleString('en-US')}
                </Text>
                <Text style={styles.serifNarrative}>
                  tasks carried cleanly across the finish line.
                </Text>
              </Animated.View>

              <Animated.View style={beat3Style}>
                <Text style={[styles.punchlineCopy, { color: theme.accentColor }]}>
                  Commitment never looked this clean.
                </Text>
              </Animated.View>

              <Animated.View style={[styles.secondaryStatsBlock, beat4Style]}>
                <View style={styles.statsRow}>
                  <View style={styles.statCol}>
                    <Text style={styles.microLabel}>TOP TAG</Text>
                    <Text style={styles.editorialValue} numberOfLines={1}>
                      {payload.tasks.topTag || 'Untagged'}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.microLabel}>PEAK DAY</Text>
                    <Text style={styles.editorialValue}>
                      {payload.tasks.peakDay
                        ? `${formatShortDate(payload.tasks.peakDay.date)} · ${payload.tasks.peakDay.count}`
                        : '—'}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </View>
          )}

          {kind === 'habits' && (
            <View style={styles.metricBlock}>
              <Animated.View style={beat1Style}>
                <Text style={styles.microLabel}>LONGEST UNBROKEN STREAK</Text>
              </Animated.View>

              <Animated.View style={beat2Style}>
                <Text style={styles.heroMetric} adjustsFontSizeToFit numberOfLines={1}>
                  {streakCount}d
                </Text>
                <Text style={styles.serifNarrative}>
                  of quiet, compounding daily discipline.
                </Text>
              </Animated.View>

              <Animated.View style={beat3Style}>
                <Text style={[styles.punchlineCopy, { color: theme.accentColor }]}>
                  While it&apos;s not a competition... there is a leaderboard.
                </Text>
              </Animated.View>

              <Animated.View style={[styles.secondaryStatsBlock, beat4Style]}>
                <View style={styles.statsRow}>
                  <View style={styles.statCol}>
                    <Text style={styles.microLabel}>TOTAL CHECK-INS</Text>
                    <Text style={styles.editorialValue}>
                      {payload.habits.totalLogs.toLocaleString('en-US')}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.microLabel}>ACTIVE DAYS</Text>
                    <Text style={styles.editorialValue}>{payload.habits.activeDays}</Text>
                  </View>
                </View>

                {payload.habits.topHabit && (
                  <View style={styles.subStatRow}>
                    <Text style={styles.microLabel}>ANCHOR HABIT</Text>
                    <Text style={[styles.editorialValue, { color: theme.accentColor }]} numberOfLines={1}>
                      {payload.habits.topHabit.name} ({payload.habits.topHabit.logsCount}x)
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>
          )}

          {kind === 'voice_ai' && (
            <View style={styles.metricBlock}>
              <Animated.View style={beat1Style}>
                <Text style={styles.microLabel}>
                  {hasVoice ? 'SPOKEN INTO CLARITY' : 'THOUGHT PARTNER'}
                </Text>
              </Animated.View>

              <Animated.View style={beat2Style}>
                <Text style={styles.heroMetric} adjustsFontSizeToFit numberOfLines={1}>
                  {voiceOrAiCount.toLocaleString('en-US')}
                </Text>
                <Text style={styles.serifNarrative}>
                  {hasVoice
                    ? `words dictated across ${payload.voice.notesCount} voice notes (${formatAudioDuration(payload.voice.totalDurationSeconds)}).`
                    : 'prompts explored with Focalyst AI.'}
                </Text>
              </Animated.View>

              <Animated.View style={beat3Style}>
                <Text style={[styles.punchlineCopy, { color: theme.accentColor }]}>
                  Thinking out loud, at scale.
                </Text>
              </Animated.View>

              <Animated.View style={[styles.secondaryStatsBlock, beat4Style]}>
                <View style={styles.statsRow}>
                  {hasVoice && hasAi && (
                    <View style={styles.statCol}>
                      <Text style={styles.microLabel}>AI PROMPTS</Text>
                      <Text style={styles.editorialValue}>
                        {payload.ai.totalPrompts.toLocaleString('en-US')}
                      </Text>
                    </View>
                  )}
                  {hasAi && (
                    <View style={styles.statCol}>
                      <Text style={styles.microLabel}>TOP CONTEXT</Text>
                      <Text style={styles.editorialValue} numberOfLines={1}>
                        {payload.ai.topTabContext || 'General'}
                      </Text>
                    </View>
                  )}
                  {hasAi && payload.ai.peakDay && !hasVoice && (
                    <View style={styles.statCol}>
                      <Text style={styles.microLabel}>PEAK AI DAY</Text>
                      <Text style={styles.editorialValue}>
                        {formatShortDate(payload.ai.peakDay.date)} · {payload.ai.peakDay.count}
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            </View>
          )}

          {kind === 'blocker' && (
            <View style={styles.metricBlock}>
              <Animated.View style={beat1Style}>
                <Text style={styles.microLabel}>IMPULSES DEFLECTED</Text>
              </Animated.View>

              <Animated.View style={beat2Style}>
                <Text style={styles.heroMetric} adjustsFontSizeToFit numberOfLines={1}>
                  {blockerCount.toLocaleString('en-US')}
                </Text>
                <Text style={styles.serifNarrative}>
                  distractions turned away at the gate.
                </Text>
              </Animated.View>

              <Animated.View style={beat3Style}>
                <Text style={[styles.punchlineCopy, { color: theme.accentColor }]}>
                  Your focus had a bodyguard.
                </Text>
              </Animated.View>

              <Animated.View style={[styles.secondaryStatsBlock, beat4Style]}>
                <View style={styles.statsRow}>
                  <View style={styles.statCol}>
                    <Text style={styles.microLabel}>SHIELDED</Text>
                    <Text style={styles.editorialValue}>
                      {formatDurationMinutes(payload.blocker.shieldedMinutes).primary}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.microLabel}>RECLAIMED</Text>
                    <Text style={[styles.editorialValue, { color: theme.accentColor }]}>
                      ~{payload.blocker.estimatedReclaimedMinutes}m
                    </Text>
                  </View>
                </View>

                {payload.blocker.topBlockedApp && (
                  <View style={styles.subStatRow}>
                    <Text style={styles.microLabel}>MOST BLOCKED</Text>
                    <Text style={styles.editorialValue} numberOfLines={1}>
                      {payload.blocker.topBlockedApp.appLabel} ({payload.blocker.topBlockedApp.attempts}x)
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>
          )}

          {kind === 'victory' && (
            <View style={styles.victoryBlock}>
              <Animated.View style={[styles.topTierPill, { borderColor: theme.accentColor }, beat1Style]}>
                <Text style={[styles.topTierText, { color: theme.accentColor }]}>
                  {payload.ranking.percentileLabel.toUpperCase()}
                </Text>
              </Animated.View>

              <Animated.View style={beat2Style}>
                <Text style={styles.archetypeSerifTitle}>{archetype.title}</Text>
                <Text style={styles.mottoSerifQuote}>“{payload.aiMotto}”</Text>
              </Animated.View>

              <Animated.View style={[styles.verdictBlock, beat3Style]}>
                <Text style={styles.verdictCopy}>{payload.aiVerdict}</Text>
              </Animated.View>

              <Animated.View style={[styles.victoryGrid, beat4Style]}>
                <View style={styles.victoryCell}>
                  <Text style={styles.microLabel}>DEEP FOCUS</Text>
                  <Text style={styles.victoryCellValue}>
                    {formatDurationMinutes(payload.focus.totalMinutes).primary}
                  </Text>
                </View>
                <View style={styles.victoryCell}>
                  <Text style={styles.microLabel}>TASKS SHIPPED</Text>
                  <Text style={styles.victoryCellValue}>
                    {payload.tasks.completedCount.toLocaleString('en-US')}
                  </Text>
                </View>
                <View style={styles.victoryCell}>
                  <Text style={styles.microLabel}>BEST STREAK</Text>
                  <Text style={styles.victoryCellValue}>{payload.habits.longestStreak}d</Text>
                </View>
                <View style={styles.victoryCell}>
                  <Text style={styles.microLabel}>
                    {payload.blocker.deflectedAttempts > 0 ? 'DEFLECTED' : 'AI PROMPTS'}
                  </Text>
                  <Text style={styles.victoryCellValue}>
                    {payload.blocker.deflectedAttempts > 0
                      ? `${payload.blocker.deflectedAttempts}x`
                      : payload.ai.totalPrompts.toLocaleString('en-US')}
                  </Text>
                </View>
              </Animated.View>
            </View>
          )}
        </View>

        {/* Lineless Editorial Poster Bottom Metadata */}
        <View style={styles.posterBottomMeta}>
          <Text style={styles.microLabel}>FOCALYST</Text>
          <Text style={styles.microLabel}>{payload.year} EDITION</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardRoot: {
    flex: 1,
    overflow: 'hidden',
  },
  posterFrame: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 22,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },
  posterTopMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  posterBottomMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  posterBody: {
    flex: 1,
    justifyContent: 'center',
  },
  microLabel: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 11,
    letterSpacing: 1.8,
    color: 'rgba(226, 232, 240, 0.72)',
    textTransform: 'uppercase',
  },
  introBlock: {
    gap: 14,
  },
  introYearNum: {
    fontFamily: FONT_SANS_EXTRA,
    fontSize: 92,
    lineHeight: 94,
    letterSpacing: -3.5,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  introSerifTitle: {
    fontFamily: FONT_SERIF,
    fontSize: 52,
    lineHeight: 54,
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  punchlineCopy: {
    fontFamily: FONT_SANS_MED,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(226, 232, 240, 0.78)',
  },
  metricBlock: {
    gap: 12,
  },
  heroMetric: {
    fontFamily: FONT_SANS_EXTRA,
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: -2.8,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  serifNarrative: {
    fontFamily: FONT_SERIF,
    fontSize: 30,
    lineHeight: 35,
    color: 'rgba(241, 245, 249, 0.92)',
    marginTop: 2,
  },
  secondaryStatsBlock: {
    paddingTop: 24,
    gap: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 28,
  },
  statCol: {
    flex: 1,
    gap: 6,
  },
  subStatRow: {
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  editorialValue: {
    fontFamily: FONT_SANS_SEMI,
    fontSize: 17,
    color: '#F8FAFC',
    fontVariant: ['tabular-nums'],
  },
  victoryBlock: {
    gap: 14,
  },
  topTierPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  topTierText: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 11,
    letterSpacing: 1.6,
  },
  archetypeSerifTitle: {
    fontFamily: FONT_SERIF,
    fontSize: 44,
    lineHeight: 46,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  mottoSerifQuote: {
    fontFamily: FONT_SERIF_ITALIC,
    fontSize: 22,
    lineHeight: 28,
    color: 'rgba(226, 232, 240, 0.88)',
    marginTop: 4,
  },
  verdictBlock: {
    paddingTop: 6,
    paddingBottom: 14,
  },
  verdictCopy: {
    fontFamily: FONT_SANS_MED,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(241, 245, 249, 0.88)',
  },
  victoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 24,
    columnGap: 28,
  },
  victoryCell: {
    width: '44%',
    gap: 5,
  },
  victoryCellValue: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 22,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
});
