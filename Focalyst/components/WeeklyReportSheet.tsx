import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, {
  Easing as ReanimatedEasing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { calculateProductivityScore } from '../src/utils/analytics';
import { markReportDismissedThisWeek } from '../src/utils/reportUtils';
import { supabase } from '../src/utils/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Monochromatic Blue Palette
const PALETTE = {
  deepNavy: '#03195b',
  royalCobalt: '#0b2cb1',
  electricCobalt: '#1951fc',
  brightAzure: '#3781fc',
  icySky: '#cbe9fd',
};

interface WeeklyReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  weeklyFocusMinutes: number;
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
  isPro?: boolean;
  userId?: string | null;
}

interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// 1. Reusable Animated Primitive: RollingNumber
// ---------------------------------------------------------------------------
interface RollingNumberProps {
  value: number;
  active: boolean;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  mode?: 'integer' | 'duration';
  style?: TextStyle | TextStyle[];
}

function RollingNumber({
  value,
  active,
  duration = 850,
  delay = 0,
  prefix = '',
  suffix = '',
  mode = 'integer',
  style,
}: RollingNumberProps) {
  const animRef = useRef(new Animated.Value(0)).current;
  const target = Math.max(0, Math.round(value));
  const [displayInt, setDisplayInt] = useState(0);
  const lastIntRef = useRef(0);

  useEffect(() => {
    if (!active) {
      animRef.stopAnimation();
      animRef.setValue(0);
      lastIntRef.current = 0;
      setDisplayInt(0);
      return;
    }

    animRef.setValue(0);
    lastIntRef.current = 0;
    setDisplayInt(0);

    const listenerId = animRef.addListener(({ value: v }) => {
      const rounded = Math.round(v);
      if (rounded !== lastIntRef.current) {
        lastIntRef.current = rounded;
        setDisplayInt(rounded);
      }
    });

    const anim = Animated.timing(animRef, {
      toValue: target,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) {
        lastIntRef.current = target;
        setDisplayInt(target);
      }
    });

    return () => {
      animRef.removeListener(listenerId);
      anim.stop();
    };
  }, [active, target, duration, delay, animRef]);

  const formatted = useMemo(() => {
    if (mode === 'duration') {
      const hrs = Math.floor(displayInt / 60);
      const mins = displayInt % 60;
      return `${prefix}${hrs}h ${mins}m${suffix}`;
    }
    return `${prefix}${displayInt}${suffix}`;
  }, [displayInt, mode, prefix, suffix]);

  return (
    <Text style={[style, styles.tabularNums]} numberOfLines={1} adjustsFontSizeToFit>
      {formatted}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// 2. Reusable Animated Primitive: AnimatedProgressBar
// ---------------------------------------------------------------------------
interface AnimatedProgressBarProps {
  percent: number;
  active: boolean;
  delay?: number;
  duration?: number;
  height?: number;
  trackColor: string;
  fillColors: [string, string, ...string[]];
  glowColor?: string;
  style?: ViewStyle;
}

function AnimatedProgressBar({
  percent,
  active,
  delay = 0,
  duration = 780,
  height = 7,
  trackColor,
  fillColors,
  glowColor,
  style,
}: AnimatedProgressBarProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(100, percent));

  useEffect(() => {
    if (!active) {
      progressAnim.stopAnimation();
      progressAnim.setValue(0);
      return;
    }

    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: clamped,
      duration,
      delay,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    });
    anim.start();

    return () => {
      anim.stop();
    };
  }, [active, clamped, delay, duration, progressAnim]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.progressTrack,
        {
          height,
          backgroundColor: trackColor,
          borderRadius: height,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.progressFillWrap,
          {
            width: animatedWidth,
            height,
            borderRadius: height,
            shadowColor: glowColor || fillColors[fillColors.length - 1],
            shadowOpacity: clamped > 0 ? 0.45 : 0,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        <LinearGradient
          colors={fillColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.progressGradient}
        />
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 3. Chunky Segmented Metric Bar (Full-Takeover Card Visual)
// ---------------------------------------------------------------------------
interface SegmentedMetricBarProps {
  percent: number;
  active: boolean;
  triggerKey: string;
}

const SEGMENT_COUNT = 10;

interface SegmentPillProps {
  index: number;
  fillProgress: SharedValue<number>;
}

function SegmentPill({ index, fillProgress }: SegmentPillProps) {
  const segStart = index * (100 / SEGMENT_COUNT);
  const segEnd = (index + 1) * (100 / SEGMENT_COUNT);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      fillProgress.value,
      [segStart, segEnd],
      [0.22, 1],
      Extrapolation.CLAMP
    ),
  }));

  return <Reanimated.View style={[styles.segmentPill, animatedStyle]} />;
}

function SegmentedMetricBar({ percent, active, triggerKey }: SegmentedMetricBarProps) {
  const fillProgress = useSharedValue(0);
  const clamped = Math.max(0, Math.min(100, percent));

  useEffect(() => {
    if (!active) {
      fillProgress.value = 0;
      return;
    }
    fillProgress.value = 0;
    fillProgress.value = withTiming(clamped, {
      duration: 680,
      easing: ReanimatedEasing.bezier(0.22, 1, 0.36, 1),
    });
  }, [active, clamped, triggerKey, fillProgress]);

  const darkBarStyle = useAnimatedStyle(() => ({
    width: `${fillProgress.value}%`,
  }));

  return (
    <View style={styles.segmentedWrap}>
      {/* Chunky pill segments */}
      <View style={styles.segmentsRow}>
        {Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
          <SegmentPill key={`seg-${i}`} index={i} fillProgress={fillProgress} />
        ))}
      </View>

      {/* Dark fill bar animating smoothly left-to-right */}
      <View style={styles.darkMeterTrack}>
        <Reanimated.View style={[styles.darkMeterFill, darkBarStyle]} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Backlit Glass Card Perimeter Glow (100% Full-Width Hardware-Smoothed Stack)
// ---------------------------------------------------------------------------
function BacklitCardGlow({ isDarkMode }: { isDarkMode: boolean }) {
  if (isDarkMode) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* 1. Bottom Edge Glow */}
        <LinearGradient
          colors={['rgba(37, 99, 235, 0.58)', 'rgba(29, 78, 216, 0.24)', 'rgba(6, 9, 19, 0)']}
          locations={[0, 0.24, 0.54]}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {/* 2. Top Edge Glow */}
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.28)', 'rgba(37, 99, 235, 0.09)', 'rgba(6, 9, 19, 0)']}
          locations={[0, 0.16, 0.36]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* 3. Left Edge Glow */}
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.26)', 'rgba(37, 99, 235, 0.08)', 'rgba(6, 9, 19, 0)']}
          locations={[0, 0.14, 0.30]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {/* 4. Right Edge Glow */}
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.26)', 'rgba(37, 99, 235, 0.08)', 'rgba(6, 9, 19, 0)']}
          locations={[0, 0.14, 0.30]}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  // Light Mode
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Bottom Edge Glow */}
      <LinearGradient
        colors={['rgba(37, 99, 235, 0.18)', 'rgba(255, 255, 255, 0)']}
        locations={[0, 0.38]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {/* 2. Top Edge Glow */}
      <LinearGradient
        colors={['rgba(37, 99, 235, 0.12)', 'rgba(255, 255, 255, 0)']}
        locations={[0, 0.38]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* 3. Left Edge Glow */}
      <LinearGradient
        colors={['rgba(37, 99, 235, 0.12)', 'rgba(255, 255, 255, 0)']}
        locations={[0, 0.38]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      {/* 4. Right Edge Glow */}
      <LinearGradient
        colors={['rgba(37, 99, 235, 0.12)', 'rgba(255, 255, 255, 0)']}
        locations={[0, 0.38]}
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// 4. Catalyst Card Types & Stacked Deck Card (ABC Reference Layout)
// ---------------------------------------------------------------------------
interface CatalystCardData {
  id: string;
  indexLabel: string;
  title: string;
  headlineTop: string;
  headlineBottom: string;
  pills: [string, string];
  body: string;
  metricLabel: string;
  metricPercent: number;
  protocolBarText: string;
  gradient: [string, string];
}

interface CatalystStackedCardProps {
  card: CatalystCardData;
  index: number;
  isLast: boolean;
  insetsBottom: number;
  onPress: (index: number, rect: CardRect) => void;
  scrollY: Animated.Value;
  deckY: number;
  registerRef: (index: number, node: View | null) => void;
}

function CatalystStackedCard({
  card,
  index,
  isLast,
  insetsBottom,
  onPress,
  scrollY,
  deckY,
  registerRef,
}: CatalystStackedCardProps) {
  const localRef = useRef<View | null>(null);

  const handlePress = () => {
    if (localRef.current && typeof localRef.current.measureInWindow === 'function') {
      localRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          onPress(index, { x, y, width, height });
        } else {
          onPress(index, {
            x: 0,
            y: SCREEN_HEIGHT * 0.45,
            width: SCREEN_WIDTH,
            height: 150,
          });
        }
      });
    } else {
      onPress(index, {
        x: 0,
        y: SCREEN_HEIGHT * 0.45,
        width: SCREEN_WIDTH,
        height: 150,
      });
    }
  };

  // Guaranteed-visible scroll-driven cascading stack entrance
  const enterStart = Math.max(0, deckY - SCREEN_HEIGHT + 40 + index * 75);
  const enterEnd = enterStart + 190;

  const translateY = scrollY.interpolate({
    inputRange: [enterStart, enterEnd],
    outputRange: [64 + index * 24, 0],
    extrapolate: 'clamp',
  });

  const scale = scrollY.interpolate({
    inputRange: [enterStart, enterEnd],
    outputRange: [0.9, 1],
    extrapolate: 'clamp',
  });

  const opacity = scrollY.interpolate({
    inputRange: [enterStart, enterEnd],
    outputRange: [0.35, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.catalystCardOuter,
        {
          marginTop: index === 0 ? 0 : -24,
          zIndex: index + 1,
          elevation: 6 + index * 3,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View
        ref={(node) => {
          localRef.current = node;
          registerRef(index, node);
        }}
        collapsable={false}
      >
        <TouchableOpacity
          activeOpacity={0.94}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={`Open ${card.title}`}
        >
          <LinearGradient
            colors={card.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.catalystCardSurface,
              { paddingBottom: isLast ? Math.max(insetsBottom, 24) + 32 : 42 },
            ]}
          >
            {/* Subtle top glass lip */}
            <View style={styles.catalystTopLip} />

            {/* Row 1: Bold Card Title + Subtle Index/Metric */}
            <View style={styles.catalystRow1}>
              <Text style={styles.catalystTitle} numberOfLines={1}>
                {card.title}
              </Text>
              <Text style={[styles.catalystIndexMetric, styles.tabularNums]}>
                {card.indexLabel} · {card.metricPercent}%
              </Text>
            </View>

            {/* Row 2: Two Clean Outlined Capsule Pills + Dark Circular Arrow Button */}
            <View style={styles.catalystRow2}>
              <View style={styles.catalystPillsRow}>
                {card.pills.map((pillLabel) => (
                  <View key={pillLabel} style={styles.catalystCapsulePill}>
                    <Text style={styles.catalystCapsuleText}>{pillLabel}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.catalystDarkArrowBtn}>
                <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// 5. Full-Screen Takeover Overlay for Expanded Catalyst Card
// ---------------------------------------------------------------------------
interface CatalystTakeoverOverlayProps {
  cards: CatalystCardData[];
  activeIndex: number;
  originRect: CardRect;
  progress: SharedValue<number>;
  onSelectIndex: (nextIndex: number) => void;
  onClose: () => void;
}

function CatalystTakeoverOverlay({
  cards,
  activeIndex,
  originRect,
  progress,
  onSelectIndex,
  onClose,
}: CatalystTakeoverOverlayProps) {
  const insets = useSafeAreaInsets();
  const card = cards[activeIndex];

  const [metricActive, setMetricActive] = useState(false);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // Start segmented bar & percentage count-up once progress passes 0.35;
  // reset cleanly only after progress returns to 0.
  useAnimatedReaction(
    () => progress.value,
    (current, previous) => {
      const prev = previous ?? 0;
      if (current >= 0.35 && prev < 0.35) {
        runOnJS(setMetricActive)(true);
      } else if (current === 0 && prev > 0) {
        runOnJS(setMetricActive)(false);
      }
    },
    []
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
      onPanResponderRelease: (_, gesture) => {
        const idx = activeIndexRef.current;
        if (gesture.dx < -45 && idx < cards.length - 1) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onSelectIndex(idx + 1);
        } else if (gesture.dx > 45 && idx > 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onSelectIndex(idx - 1);
        }
      },
    })
  ).current;

  const shellAnimatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      top: interpolate(p, [0, 1], [originRect.y, 0], Extrapolation.CLAMP),
      left: interpolate(p, [0, 1], [originRect.x, 0], Extrapolation.CLAMP),
      width: interpolate(p, [0, 1], [originRect.width, SCREEN_WIDTH], Extrapolation.CLAMP),
      height: interpolate(p, [0, 1], [originRect.height, SCREEN_HEIGHT], Extrapolation.CLAMP),
      borderRadius: interpolate(p, [0, 1], [24, 0], Extrapolation.CLAMP),
    };
  }, [originRect]);

  const collapsedLayerStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.25], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [0, 0.25], [0, -6], Extrapolation.CLAMP) },
      ],
    };
  });

  const expandedLayerStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.25, 0.75], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [0.25, 0.85], [16, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View style={styles.takeoverBackdrop} pointerEvents="box-none">
      <Reanimated.View
        {...panResponder.panHandlers}
        style={[styles.takeoverShell, shellAnimatedStyle]}
      >
        <LinearGradient
          colors={card.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          {/* Collapsed Header Layer — stays mounted and cross-fades with progress */}
          <Reanimated.View
            pointerEvents="none"
            style={[styles.takeoverCollapsedLayer, collapsedLayerStyle]}
          >
            <View style={styles.catalystTopLip} />

            <View style={styles.catalystRow1}>
              <Text style={styles.catalystTitle} numberOfLines={1}>
                {card.title}
              </Text>
              <Text style={[styles.catalystIndexMetric, styles.tabularNums]}>
                {card.indexLabel} · {card.metricPercent}%
              </Text>
            </View>

            <View style={styles.catalystRow2}>
              <View style={styles.catalystPillsRow}>
                {card.pills.map((pillLabel) => (
                  <View key={pillLabel} style={styles.catalystCapsulePill}>
                    <Text style={styles.catalystCapsuleText}>{pillLabel}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.catalystDarkArrowBtn}>
                <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
              </View>
            </View>
          </Reanimated.View>

          {/* Expanded Detail Layer — stays mounted and cross-fades with progress */}
          <Reanimated.View
            style={[
              styles.takeoverGradient,
              {
                paddingTop: insets.top + 14,
                paddingBottom: insets.bottom + 20,
              },
              expandedLayerStyle,
            ]}
          >
            {/* Top Bar: Centered 3-Dot Indicator + Top-Right Collapse Button */}
            <View style={styles.takeoverTopBar}>
              <View style={styles.takeoverTopSpacer} />

              <View style={styles.dotsRow}>
                {cards.map((c, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => {
                        if (idx !== activeIndex) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          onSelectIndex(idx);
                        }
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.progressDot,
                          isActive ? styles.progressDotActive : styles.progressDotInactive,
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={styles.takeoverCollapseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.8}
                accessibilityLabel="Collapse insight"
              >
                <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Main Editorial Canvas */}
            <View style={styles.takeoverMain}>
              {/* Hero 2-Line Display Headline */}
              <View>
                <Text style={styles.takeoverHeadlineTop}>{card.headlineTop}</Text>
                <Text style={styles.takeoverHeadlineBottom}>{card.headlineBottom}</Text>

                {/* Clean Outlined Pills Row */}
                <View style={styles.takeoverPillsRow}>
                  {card.pills.map((pillLabel) => (
                    <View key={pillLabel} style={styles.catalystCapsulePill}>
                      <Text style={styles.catalystCapsuleText}>{pillLabel}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* AI Analysis Body + Segmented Visual Metric */}
              <View style={styles.takeoverBodySection}>
                <Text style={styles.takeoverBodyText}>{card.body}</Text>

                <View style={styles.takeoverMetricCard}>
                  <View style={styles.takeoverMetricHeader}>
                    <Text style={styles.takeoverMetricLabel}>{card.metricLabel}</Text>
                    <RollingNumber
                      key={`roll-${card.id}-${activeIndex}`}
                      value={card.metricPercent}
                      active={metricActive}
                      delay={0}
                      duration={680}
                      suffix="%"
                      style={styles.takeoverMetricNumber}
                    />
                  </View>

                  <SegmentedMetricBar
                    percent={card.metricPercent}
                    active={metricActive}
                    triggerKey={`${card.id}-${activeIndex}`}
                  />
                </View>
              </View>
            </View>

            {/* Bottom Dark Action Pill Bar */}
            <TouchableOpacity
              style={styles.takeoverBottomPill}
              activeOpacity={0.86}
              onPress={onClose}
            >
              <Text style={styles.takeoverBottomPillText} numberOfLines={1}>
                {card.protocolBarText}
              </Text>
              <Ionicons name="chevron-down" size={16} color="rgba(255, 255, 255, 0.72)" />
            </TouchableOpacity>
          </Reanimated.View>
        </LinearGradient>
      </Reanimated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main WeeklyReportSheet Component
// ---------------------------------------------------------------------------
export default function WeeklyReportSheet({
  isOpen,
  onClose,
  isDarkMode = true,
  weeklyFocusMinutes = 0,
  tasksCompleted = 0,
  tasksTotal = 0,
  habitsCompleted = 0,
  habitsTotal = 0,
  isPro = false,
  userId = null,
}: WeeklyReportSheetProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [deckY, setDeckY] = useState(560);

  // Full-screen takeover state for Catalyst cards
  const cardRefs = useRef<Array<View | null>>([null, null, null]);
  const [takeoverIndex, setTakeoverIndex] = useState<number | null>(null);
  const [originRect, setOriginRect] = useState<CardRect | null>(null);
  const expandProgress = useSharedValue(0);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      scrollY.setValue(0);
      setTakeoverIndex(null);
      setOriginRect(null);
      expandProgress.value = 0;
    }
  }, [isOpen, scrollY, expandProgress]);

  const handleClose = () => {
    if (takeoverIndex !== null) {
      handleCollapseCard();
      return;
    }
    if (userId) {
      markReportDismissedThisWeek(userId, supabase).catch(() => {});
    }
    onClose();
  };

  const handleOpenCard = (index: number, rect: CardRect) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    expandProgress.value = 0;
    setOriginRect(rect);
    setTakeoverIndex(index);

    requestAnimationFrame(() => {
      expandProgress.value = withTiming(1, {
        duration: 420,
        easing: ReanimatedEasing.bezier(0.22, 1, 0.36, 1),
      });
    });
  };

  const handleSelectTakeoverIndex = (nextIndex: number) => {
    setTakeoverIndex(nextIndex);
    // Update return origin rect to match the newly selected card if measurable
    const node = cardRefs.current[nextIndex];
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setOriginRect({ x, y, width, height });
        }
      });
    }
  };

  const finishCollapse = (finished?: boolean) => {
    if (finished) {
      setTakeoverIndex(null);
      setOriginRect(null);
    }
  };

  const handleCollapseCard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    expandProgress.value = withTiming(
      0,
      {
        duration: 380,
        easing: ReanimatedEasing.bezier(0.22, 1, 0.36, 1),
      },
      (finished) => {
        runOnJS(finishCollapse)(finished);
      }
    );
  };

  const weeklyFocusHours = weeklyFocusMinutes / 60;
  const taskRatio = tasksTotal > 0 ? tasksCompleted / tasksTotal : 0;
  const habitRatio = habitsTotal > 0 ? habitsCompleted / habitsTotal : 0;

  const tasksPercent = Math.round(taskRatio * 100);
  const habitPercent = Math.round(habitRatio * 100);
  const focusGoalPercent = Math.min(100, Math.round((weeklyFocusHours / 20) * 100));

  // Calculate Productivity Score using exact weighted algorithm
  const { score, focusPoints } = useMemo(() => {
    return calculateProductivityScore(
      weeklyFocusHours,
      tasksCompleted,
      tasksTotal,
      habitsCompleted,
      habitsTotal
    );
  }, [weeklyFocusHours, tasksCompleted, tasksTotal, habitsCompleted, habitsTotal]);

  const totalFocusMinsInt = Math.max(0, Math.round(weeklyFocusMinutes));
  const focusHoursInt = Math.floor(totalFocusMinsInt / 60);
  const focusMinsRemaining = totalFocusMinsInt % 60;

  // Dynamic status pills
  const tasksStatus = useMemo(() => {
    if (tasksPercent >= 70) return { label: 'ON TRACK', tone: 'good' as const };
    if (tasksPercent >= 40) return { label: 'BUILDING', tone: 'mid' as const };
    return { label: 'AT RISK', tone: 'low' as const };
  }, [tasksPercent]);

  const habitsTag = habitPercent >= 75 ? 'HIGH' : habitPercent >= 40 ? 'MID' : 'LOW';

  // Strengths and Improvements logic based on blueprint rule
  const showStrengths = focusPoints > 30 || habitRatio > 0.8;
  const showImprovements = taskRatio < 0.3 || habitRatio < 0.5;

  const strengthsList = useMemo(() => {
    const list: string[] = [];
    if (focusPoints > 30) {
      list.push(
        `You demonstrated impressive dedication with ${focusHoursInt} hours and ${focusMinsRemaining} minutes of total focus time, maintaining sustained concentration and demonstrating excellent self-control.`
      );
    }
    if (habitRatio > 0.8) {
      list.push('You also kept all your habit streaks active, staying highly consistent.');
    }
    if (tasksCompleted > 0 && taskRatio >= 0.7) {
      list.push(
        `You completed a significant majority of your tasks (${tasksCompleted}/${tasksTotal}), keeping your momentum strong.`
      );
    }
    return list;
  }, [focusPoints, habitRatio, tasksCompleted, tasksTotal, focusHoursInt, focusMinsRemaining, taskRatio]);

  const improvementsList = useMemo(() => {
    const list: string[] = [];
    if (taskRatio < 0.3) {
      if (tasksTotal === 0) {
        list.push(
          'Your primary area for improvement is task planning, as no tasks were added or completed this week.'
        );
      } else {
        list.push(
          `Your primary area for improvement is task completion, as only ${tasksCompleted}/${tasksTotal} tasks were completed this week.`
        );
      }
    }
    if (habitRatio < 0.5) {
      list.push(
        `Additionally, your habit consistency was at ${habitPercent}%, indicating missed opportunities to reinforce positive behaviors.`
      );
    }
    return list;
  }, [taskRatio, habitRatio, tasksCompleted, tasksTotal, habitPercent]);

  const patternText =
    'Your focus activity peaks on Sunday afternoon. You maintain high concentration levels when tasks are broken down into smaller milestones.';
  const weaknessText =
    'You tend to delay starting your habits. A significant drop in task completion was observed mid-week (Wednesday).';
  const prescriptionText =
    'We recommend planning your hardest tasks on Monday morning and setting a consistent Pomodoro pattern (25/5) to maintain energy levels.';

  const catalystCards: CatalystCardData[] = useMemo(
    () => [
      {
        id: 'pattern',
        indexLabel: '01',
        title: 'Pattern Intelligence',
        headlineTop: 'PATTERN',
        headlineBottom: 'INTELLIGENCE',
        pills: ['Pattern', 'Focus Peak'],
        body: patternText,
        metricLabel: 'Focus Peak Index',
        metricPercent: Math.min(96, Math.max(72, score + 48)),
        protocolBarText: 'PEAK WINDOW  •  SUNDAY AFTERNOON',
        gradient: [PALETTE.electricCobalt, PALETTE.royalCobalt],
      },
      {
        id: 'weakness',
        indexLabel: '02',
        title: 'Weakness Diagnosis',
        headlineTop: 'WEAKNESS',
        headlineBottom: 'DIAGNOSIS',
        pills: ['Diagnosis', 'Friction Point'],
        body: weaknessText,
        metricLabel: 'Mid-Week Friction Index',
        metricPercent: Math.min(92, Math.max(48, 100 - score)),
        protocolBarText: 'WATCHPOINT  •  WEDNESDAY DIP',
        gradient: ['#F25C5C', '#DC2626'],
      },
      {
        id: 'prescription',
        indexLabel: '03',
        title: 'Priority Prescription',
        headlineTop: 'PRIORITY',
        headlineBottom: 'PRESCRIPTION',
        pills: ['Prescription', 'Next Action'],
        body: prescriptionText,
        metricLabel: 'Projected Score Lift',
        metricPercent: 86,
        protocolBarText: 'PROTOCOL  •  MONDAY AM 25/5 SPRINT',
        gradient: ['#10B981', '#059669'],
      },
    ],
    [score]
  );

  // Theme tokens
  const screenBg = isDarkMode ? '#050C24' : '#F4F8FF';
  const textPri = isDarkMode ? '#FFFFFF' : PALETTE.deepNavy;
  const textSec = isDarkMode ? 'rgba(203, 233, 253, 0.72)' : '#475569';
  const heroColor = isDarkMode ? PALETTE.icySky : PALETTE.electricCobalt;
  const lockedCardBg = isDarkMode ? 'rgba(3, 25, 91, 0.45)' : '#F0F7FF';
  const lockedCardBorder = isDarkMode ? 'rgba(55, 129, 252, 0.30)' : PALETTE.icySky;

  const trendUp = score >= 50;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.modalRoot,
          { backgroundColor: screenBg, paddingTop: insets.top + 10 },
        ]}
      >
        {/* Minimalist Top Bar */}
        <View style={styles.topHeaderBar}>
          <View style={styles.headerTitleCol}>
            <Text style={[styles.headerTitle, { color: textPri }]}>
              Weekly Productivity Report
            </Text>
            <Text style={[styles.headerSubtitle, { color: textSec }]}>
              Last Week: Mon – Sun
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleClose}
            style={[
              styles.closeBtn,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(55, 129, 252, 0.16)'
                  : 'rgba(3, 25, 91, 0.08)',
                borderColor: isDarkMode
                  ? 'rgba(203, 233, 253, 0.18)'
                  : 'rgba(3, 25, 91, 0.10)',
              },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.75}
          >
            <Ionicons name="close" size={20} color={textPri} />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: isPro ? 0 : insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
        >
          {/* ============================================================== */}
          {/* 1. HERO SCORE SECTION — KAIROS EDITORIAL SCALE                 */}
          {/* ============================================================== */}
          <View style={styles.heroSection}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroLeft}>
                <RollingNumber
                  value={score}
                  active={isOpen}
                  duration={920}
                  suffix="%"
                  style={[styles.heroScoreText, { color: heroColor }]}
                />
              </View>

              <View style={styles.heroRight}>
                <Ionicons
                  name={trendUp ? 'arrow-up' : 'arrow-down'}
                  size={20}
                  color={isDarkMode ? PALETTE.icySky : PALETTE.electricCobalt}
                />
                <Text style={[styles.heroCaption, { color: textSec }]}>
                  Last week
                </Text>
              </View>
            </View>

            <Text style={[styles.heroLabel, { color: textSec }]}>
              Productivity Score
            </Text>

            <AnimatedProgressBar
              percent={score}
              active={isOpen}
              delay={60}
              duration={840}
              height={7}
              trackColor={
                isDarkMode
                  ? 'rgba(203, 233, 253, 0.12)'
                  : 'rgba(3, 25, 91, 0.10)'
              }
              fillColors={[
                PALETTE.electricCobalt,
                PALETTE.brightAzure,
                PALETTE.icySky,
              ]}
              glowColor={PALETTE.brightAzure}
              style={styles.heroProgressBar}
            />
          </View>

          {/* ============================================================== */}
          {/* ASYMMETRIC BLUE-SHADE BENTO GRID                               */}
          {/* ============================================================== */}
          <View style={styles.bentoGrid}>
            {/* Row 1 — Full-Width Banner Tile: Tasks Completed */}
            <LinearGradient
              colors={
                isDarkMode
                  ? [PALETTE.brightAzure, PALETTE.electricCobalt]
                  : [PALETTE.icySky, '#B7E0FD']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.bentoBannerTile,
                {
                  borderColor: isDarkMode
                    ? 'rgba(203, 233, 253, 0.24)'
                    : 'rgba(25, 81, 252, 0.16)',
                },
              ]}
            >
              <View style={styles.bannerTopRow}>
                <View style={styles.bannerLeft}>
                  <Text
                    style={[
                      styles.bannerEyebrow,
                      {
                        color: isDarkMode
                          ? 'rgba(255, 255, 255, 0.82)'
                          : 'rgba(3, 25, 91, 0.72)',
                      },
                    ]}
                  >
                    Tasks Completed
                  </Text>
                  <RollingNumber
                    value={tasksPercent}
                    active={isOpen}
                    delay={90}
                    duration={860}
                    suffix="%"
                    style={[
                      styles.bannerMetric,
                      { color: isDarkMode ? '#FFFFFF' : PALETTE.deepNavy },
                    ]}
                  />
                  <Text
                    style={[
                      styles.bannerSubtitle,
                      {
                        color: isDarkMode
                          ? 'rgba(255, 255, 255, 0.80)'
                          : 'rgba(3, 25, 91, 0.68)',
                      },
                    ]}
                  >
                    {tasksCompleted} of {tasksTotal} tasks
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(3, 25, 91, 0.38)'
                        : 'rgba(3, 25, 91, 0.12)',
                      borderColor: isDarkMode
                        ? 'rgba(203, 233, 253, 0.30)'
                        : 'rgba(3, 25, 91, 0.18)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          tasksStatus.tone === 'good'
                            ? '#34D399'
                            : tasksStatus.tone === 'mid'
                            ? '#FBBF24'
                            : '#F87171',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: isDarkMode ? '#FFFFFF' : PALETTE.deepNavy },
                    ]}
                  >
                    {tasksStatus.label}
                  </Text>
                </View>
              </View>

              <AnimatedProgressBar
                percent={tasksPercent}
                active={isOpen}
                delay={140}
                duration={800}
                height={7}
                trackColor={
                  isDarkMode
                    ? 'rgba(3, 25, 91, 0.35)'
                    : 'rgba(3, 25, 91, 0.14)'
                }
                fillColors={
                  isDarkMode
                    ? [PALETTE.icySky, '#FFFFFF']
                    : [PALETTE.deepNavy, PALETTE.electricCobalt]
                }
                glowColor={isDarkMode ? '#FFFFFF' : PALETTE.electricCobalt}
                style={{ marginTop: 16 }}
              />
            </LinearGradient>

            {/* Row 2 — Asymmetric 2-Column Split */}
            <View style={styles.bentoSplitRow}>
              {/* Left Column — Tall Vertical Tile: Focus Time */}
              <LinearGradient
                colors={['#072377', PALETTE.deepNavy]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.focusTallTile}
              >
                <View style={styles.focusTileTop}>
                  <Text style={styles.focusTileLabel}>Focus Time</Text>
                  <View style={styles.focusIconDot}>
                    <Ionicons name="time-outline" size={14} color={PALETTE.icySky} />
                  </View>
                </View>

                <View style={styles.focusTileBottom}>
                  <RollingNumber
                    value={totalFocusMinsInt}
                    active={isOpen}
                    delay={160}
                    duration={900}
                    mode="duration"
                    style={styles.focusMetric}
                  />
                  <Text style={styles.focusSubtext}>Total deep work</Text>
                  <AnimatedProgressBar
                    percent={focusGoalPercent}
                    active={isOpen}
                    delay={220}
                    duration={800}
                    height={5}
                    trackColor="rgba(203, 233, 253, 0.16)"
                    fillColors={[PALETTE.brightAzure, PALETTE.icySky]}
                    glowColor={PALETTE.icySky}
                    style={{ marginTop: 12 }}
                  />
                </View>
              </LinearGradient>

              {/* Right Column — 2 Stacked Medium Tiles */}
              <View style={styles.bentoRightCol}>
                {/* Top-Right Tile: Plan / Tasks Done */}
                <LinearGradient
                  colors={['#1037CE', PALETTE.royalCobalt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.planTile}
                >
                  <View style={styles.mediumTileHeader}>
                    <Text style={styles.mediumTileLabel}>Plan</Text>
                    <Ionicons
                      name="checkmark-done"
                      size={15}
                      color="rgba(203, 233, 253, 0.85)"
                    />
                  </View>
                  <View>
                    <RollingNumber
                      value={tasksCompleted}
                      active={isOpen}
                      delay={200}
                      duration={780}
                      style={styles.mediumTileMetric}
                    />
                    <Text style={styles.mediumTileSub}>tasks finished</Text>
                  </View>
                </LinearGradient>

                {/* Bottom-Right Tile: My Habits */}
                <LinearGradient
                  colors={['#2B64FF', PALETTE.electricCobalt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.habitsTile}
                >
                  <View style={styles.mediumTileHeader}>
                    <Text style={styles.mediumTileLabel}>My Habits</Text>
                    <View style={styles.habitLevelPill}>
                      <Text style={styles.habitLevelPillText}>{habitsTag}</Text>
                    </View>
                  </View>

                  <View>
                    <RollingNumber
                      value={habitPercent}
                      active={isOpen}
                      delay={260}
                      duration={820}
                      suffix="%"
                      style={styles.mediumTileMetric}
                    />
                    <AnimatedProgressBar
                      percent={habitPercent}
                      active={isOpen}
                      delay={310}
                      duration={780}
                      height={5}
                      trackColor="rgba(255, 255, 255, 0.22)"
                      fillColors={[PALETTE.icySky, '#FFFFFF']}
                      glowColor="#FFFFFF"
                      style={{ marginTop: 10 }}
                    />
                  </View>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* ============================================================== */}
          {/* 2. EDITORIAL GLASS CARDS (NO ICONS, UNIFIED GRADIENT)          */}
          {/* ============================================================== */}
          {showStrengths && strengthsList.length > 0 && (
            <LinearGradient
              colors={
                isDarkMode
                  ? ['rgba(16, 185, 129, 0.22)', 'rgba(16, 185, 129, 0.08)', '#070E20']
                  : ['rgba(16, 185, 129, 0.14)', '#F0FDF4']
              }
              locations={isDarkMode ? [0, 0.42, 1] : undefined}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[
                styles.editorialCard,
                {
                  borderColor: isDarkMode
                    ? 'rgba(16, 185, 129, 0.28)'
                    : 'rgba(16, 185, 129, 0.24)',
                },
              ]}
            >
              <Text
                style={[
                  styles.editorialEyebrow,
                  { color: isDarkMode ? '#34D399' : '#059669' },
                ]}
              >
                STRENGTHS
              </Text>
              <View style={styles.editorialBodyList}>
                {strengthsList.map((item, idx) => (
                  <Text
                    key={`str-${idx}`}
                    style={[
                      styles.editorialBodyText,
                      { color: isDarkMode ? '#F1F5F9' : '#0F172A' },
                    ]}
                  >
                    {strengthsList.length > 1 ? `—  ${item}` : item}
                  </Text>
                ))}
              </View>
            </LinearGradient>
          )}

          {showImprovements && improvementsList.length > 0 && (
            <View
              style={[
                styles.editorialCard,
                {
                  backgroundColor: isDarkMode ? '#060913' : '#FFFFFF',
                  borderColor: isDarkMode
                    ? 'rgba(59, 130, 246, 0.40)'
                    : 'rgba(37, 99, 235, 0.28)',
                },
              ]}
            >
              <BacklitCardGlow isDarkMode={isDarkMode} />
              <Text
                style={[
                  styles.editorialEyebrow,
                  { color: isDarkMode ? '#93C5FD' : '#1D4ED8' },
                ]}
              >
                AREAS TO IMPROVE
              </Text>
              <View style={styles.editorialBodyList}>
                {improvementsList.map((item, idx) => (
                  <Text
                    key={`imp-${idx}`}
                    style={[
                      styles.editorialBodyText,
                      { color: isDarkMode ? '#F1F5F9' : '#0F172A' },
                    ]}
                  >
                    {improvementsList.length > 1 ? `—  ${item}` : item}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {(showStrengths || showImprovements) && (
            <View
              style={[
                styles.editorialCard,
                {
                  backgroundColor: isDarkMode ? '#060913' : '#FFFFFF',
                  borderColor: isDarkMode
                    ? 'rgba(59, 130, 246, 0.40)'
                    : 'rgba(37, 99, 235, 0.28)',
                },
              ]}
            >
              <BacklitCardGlow isDarkMode={isDarkMode} />
              <Text
                style={[
                  styles.editorialEyebrow,
                  { color: isDarkMode ? '#93C5FD' : '#1D4ED8' },
                ]}
              >
                WEEKLY INSIGHTS
              </Text>
              <Text
                style={[
                  styles.editorialBodyText,
                  { color: isDarkMode ? '#E2E8F0' : '#0F172A' },
                ]}
              >
                {strengthsList.join(' ')} {improvementsList.join(' ')}
                {score >= 60
                  ? ' Awesome job! Keep leveraging your high focus capacity to drive consistent progress in your upcoming tasks.'
                  : ' Set small, achievable task and habit milestones next week to systematically elevate your overall score.'}
              </Text>
            </View>
          )}

          {/* ============================================================== */}
          {/* 3 & 4. PRO-ONLY CATALYST INSIGHTS — STACKED DECK               */}
          {/* ============================================================== */}
          <View
            style={styles.catalystSection}
            onLayout={(e) => setDeckY(e.nativeEvent.layout.y)}
          >
            <View style={styles.catalystSectionHeader}>
              <View style={styles.catalystHeaderLeft}>
                <View>
                  <Text style={[styles.catalystSectionTitle, { color: textPri }]}>
                    Catalyst Insights
                  </Text>
                  <Text style={[styles.catalystSectionSub, { color: textSec }]}>
                    {isPro ? 'Tap any card to open full analysis' : 'Focalyst Pro Intelligence'}
                  </Text>
                </View>
              </View>

              {isPro && (
                <View
                  style={[
                    styles.proBadge,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(25, 81, 252, 0.28)'
                        : 'rgba(25, 81, 252, 0.12)',
                      borderColor: isDarkMode
                        ? 'rgba(203, 233, 253, 0.25)'
                        : 'rgba(25, 81, 252, 0.22)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.proBadgeText,
                      { color: isDarkMode ? PALETTE.icySky : PALETTE.electricCobalt },
                    ]}
                  >
                    PRO
                  </Text>
                </View>
              )}
            </View>

            {!isPro ? (
              <View
                style={[
                  styles.lockedCard,
                  { backgroundColor: lockedCardBg, borderColor: lockedCardBorder },
                ]}
              >
                <View style={styles.blurContainer}>
                  <View
                    style={[
                      styles.lockIconWrap,
                      {
                        backgroundColor: isDarkMode
                          ? 'rgba(55, 129, 252, 0.18)'
                          : 'rgba(25, 81, 252, 0.10)',
                      },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={26}
                      color={isDarkMode ? PALETTE.icySky : PALETTE.electricCobalt}
                    />
                  </View>
                  <Text style={[styles.lockedText, { color: textPri }]}>
                    Upgrade to Pro to unlock deep Catalyst Insights
                  </Text>
                  <Text style={[styles.lockedSubtext, { color: textSec }]}>
                    Get personalized cognitive pacing recommendations and habit scheduling hacks powered by Focalyst AI.
                  </Text>
                  <TouchableOpacity
                    style={[styles.proButton, { backgroundColor: PALETTE.electricCobalt }]}
                    activeOpacity={0.9}
                    onPress={handleClose}
                  >
                    <Text style={styles.proButtonText}>Upgrade to Pro</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.catalystDeckContainer}>
                {catalystCards.map((card, idx) => (
                  <CatalystStackedCard
                    key={card.id}
                    card={card}
                    index={idx}
                    isLast={idx === catalystCards.length - 1}
                    insetsBottom={insets.bottom}
                    onPress={handleOpenCard}
                    scrollY={scrollY}
                    deckY={deckY}
                    registerRef={(i, node) => {
                      cardRefs.current[i] = node;
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        </Animated.ScrollView>

        {/* Full-Screen Takeover Overlay when a Catalyst Card is tapped */}
        {isPro && takeoverIndex !== null && originRect !== null && (
          <CatalystTakeoverOverlay
            cards={catalystCards}
            activeIndex={takeoverIndex}
            originRect={originRect}
            progress={expandProgress}
            onSelectIndex={handleSelectTakeoverIndex}
            onClose={handleCollapseCard}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
  modalRoot: {
    flex: 1,
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitleCol: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 16,
  },

  // 1. Kairos Editorial Hero Score
  heroSection: {
    paddingTop: 10,
    paddingBottom: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroLeft: {
    flexShrink: 1,
  },
  heroScoreText: {
    fontSize: 90,
    fontWeight: '700',
    letterSpacing: -3.5,
    lineHeight: 92,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.1,
  },
  heroRight: {
    alignItems: 'flex-end',
    gap: 4,
    paddingBottom: 8,
  },
  heroCaption: {
    fontSize: 13,
    fontWeight: '500',
  },
  heroProgressBar: {
    marginTop: 14,
  },

  // Progress Bar Primitive
  progressTrack: {
    width: '100%',
    overflow: 'hidden',
  },
  progressFillWrap: {
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  // Bento Grid
  bentoGrid: {
    gap: 12,
  },
  bentoBannerTile: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
  },
  bannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  bannerLeft: {
    flex: 1,
  },
  bannerEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bannerMetric: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.2,
    marginTop: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Asymmetric 2-Column Split
  bentoSplitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  focusTallTile: {
    flex: 1,
    minHeight: 214,
    borderRadius: 22,
    padding: 18,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(203, 233, 253, 0.18)',
  },
  focusTileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusTileLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(203, 233, 253, 0.84)',
  },
  focusIconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(203, 233, 253, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusTileBottom: {
    marginTop: 28,
  },
  focusMetric: {
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -1,
    color: PALETTE.icySky,
  },
  focusSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(203, 233, 253, 0.68)',
    marginTop: 4,
  },
  bentoRightCol: {
    flex: 1,
    gap: 12,
  },
  planTile: {
    flex: 1,
    minHeight: 98,
    borderRadius: 22,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(203, 233, 253, 0.18)',
  },
  habitsTile: {
    flex: 1,
    minHeight: 104,
    borderRadius: 22,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(203, 233, 253, 0.24)',
  },
  mediumTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mediumTileLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.88)',
  },
  mediumTileMetric: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#FFFFFF',
  },
  mediumTileSub: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(203, 233, 253, 0.80)',
    marginTop: 2,
  },
  habitLevelPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(3, 25, 91, 0.32)',
    borderWidth: 1,
    borderColor: 'rgba(203, 233, 253, 0.28)',
  },
  habitLevelPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#FFFFFF',
  },

  // 2. Editorial Backlit Glass Cards (Areas to Improve & Weekly Insights)
  editorialCard: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  editorialEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  editorialBodyList: {
    gap: 10,
  },
  editorialBodyText: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },

  // 3. Catalyst Stacked Deck (ABC Reference Style)
  catalystSection: {
    marginTop: 6,
    marginBottom: 0,
    gap: 14,
  },
  catalystSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalystHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catalystSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  catalystSectionSub: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },
  proBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  catalystDeckContainer: {
    paddingTop: 4,
    marginHorizontal: -20,
  },
  catalystCardOuter: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
  catalystCardSurface: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  catalystTopLip: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
  },
  catalystRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  catalystTitle: {
    flex: 1,
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  catalystIndexMetric: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  catalystRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  catalystPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  catalystCapsulePill: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  catalystCapsuleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  catalystDarkArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0A0D14',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 4. Full-Screen Takeover Overlay
  takeoverBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 20,
  },
  takeoverShell: {
    position: 'absolute',
    zIndex: 100,
    elevation: 20,
    overflow: 'hidden',
  },
  takeoverCollapsedLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  takeoverGradient: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  takeoverTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  takeoverTopSpacer: {
    width: 38,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  progressDot: {
    height: 6,
    borderRadius: 999,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  progressDotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
  },
  takeoverCollapseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  takeoverMain: {
    flex: 1,
    justifyContent: 'center',
    gap: 28,
  },
  takeoverHeadlineTop: {
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 42,
    letterSpacing: -1.2,
    color: '#FFFFFF',
  },
  takeoverHeadlineBottom: {
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 42,
    letterSpacing: -1.2,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  takeoverPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
  },
  takeoverBodySection: {
    gap: 24,
  },
  takeoverBodyText: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  takeoverMetricCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    gap: 14,
  },
  takeoverMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  takeoverMetricLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  takeoverMetricNumber: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#FFFFFF',
  },
  segmentedWrap: {
    gap: 10,
  },
  segmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  segmentPill: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },
  darkMeterTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 13, 20, 0.28)',
    overflow: 'hidden',
  },
  darkMeterFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#0A0D14',
  },
  takeoverBottomPill: {
    backgroundColor: '#0A0D14',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  takeoverBottomPillText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#FFFFFF',
  },

  // Locked Pro Card
  lockedCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 24,
    overflow: 'hidden',
  },
  blurContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  lockedText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  lockedSubtext: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  proButton: {
    paddingVertical: 12,
    paddingHorizontal: 34,
    borderRadius: 999,
  },
  proButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
