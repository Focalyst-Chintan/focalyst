import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  ChartColumn,
  Hourglass,
  LayoutGrid,
  ListChecks,
  Mic,
  NotebookPen,
  Plug,
  Repeat,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { GUTTER, useOnboardingTheme, withAlpha } from './theme';

// Section 3.5. The colours are a deliberate exception to the brand-blue rule, for this cloud only.
// tint = text on dark (Tailwind 200 family), shade = text on light (800 family): both above 4.5:1.

interface Pill {
  label: string;
  icon: LucideIcon;
  color: string;
  tint: string;
  shade: string;
}

const PILLS: Pill[] = [
  { label: 'Tasks', icon: ListChecks, color: '#3781FC', tint: '#BFDBFE', shade: '#1E40AF' },
  { label: 'Habits', icon: Repeat, color: '#34D399', tint: '#A7F3D0', shade: '#065F46' },
  { label: 'Focus timer', icon: Timer, color: '#22D3EE', tint: '#A5F3FC', shade: '#155E75' },
  { label: 'Notes', icon: NotebookPen, color: '#FBBF24', tint: '#FDE68A', shade: '#92400E' },
  { label: 'Voice notes', icon: Mic, color: '#F472B6', tint: '#FBCFE8', shade: '#9D174D' },
  { label: 'Countdowns', icon: Hourglass, color: '#FB923C', tint: '#FED7AA', shade: '#9A3412' },
  { label: 'Habit groups', icon: Users, color: '#A78BFA', tint: '#DDD6FE', shade: '#5B21B6' },
  { label: 'Insights', icon: ChartColumn, color: '#60A5FA', tint: '#BFDBFE', shade: '#1E40AF' },
  { label: 'Focalyst AI', icon: Sparkles, color: '#818CF8', tint: '#C7D2FE', shade: '#3730A3' },
  { label: 'Widgets', icon: LayoutGrid, color: '#2DD4BF', tint: '#99F6E4', shade: '#115E59' },
  { label: 'App blocking', icon: ShieldCheck, color: '#F87171', tint: '#FECACA', shade: '#991B1B' },
  { label: 'MCP server', icon: Plug, color: '#CBD5E1', tint: '#E2E8F0', shade: '#334155' },
];

const A11Y_LABEL = `Focalyst features: ${PILLS.map((p) => p.label.toLowerCase()).join(', ')}.`;

function FeaturePill({ pill, index, compact }: { pill: Pill; index: number; compact: boolean }) {
  const t = useOnboardingTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.96);
  const float = useSharedValue(0);

  useEffect(() => {
    const delay = reduceMotion ? 0 : index * 40;
    opacity.value = withDelay(delay, withTiming(1, { duration: reduceMotion ? 120 : 360 }));
    if (reduceMotion) return;
    scale.value = withDelay(delay, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
    // A very slow 2 pt float over 6 s, each pill offset.
    const ease = Easing.inOut(Easing.sin);
    float.value = withDelay(
      delay + ((index * 470) % 3000),
      withRepeat(withSequence(withTiming(-2, { duration: 3000, easing: ease }), withTiming(0, { duration: 3000, easing: ease })), -1),
    );
  }, [float, index, opacity, reduceMotion, scale]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: float.value }, { scale: scale.value }],
  }));

  const height = compact ? 32 : 34;
  const circle = compact ? 20 : 22;
  const Icon = pill.icon;

  return (
    <Animated.View
      style={[
        animated,
        t.dark && {
          shadowColor: pill.color,
          shadowOpacity: 0.18,
          shadowRadius: 9,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      <View
        style={[
          styles.pill,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: withAlpha(pill.color, t.dark ? 0.14 : 0.1),
            borderColor: withAlpha(pill.color, t.dark ? 0.55 : 0.35),
          },
        ]}
      >
        {t.dark ? <View pointerEvents="none" style={[styles.highlight, { borderRadius: height / 2 }]} /> : null}
        <View style={[styles.circle, { width: circle, height: circle, borderRadius: circle / 2, backgroundColor: pill.color }]}>
          <Icon size={12} color={t.canvas} strokeWidth={2.5} />
        </View>
        <Text style={[styles.label, { fontSize: compact ? 13 : 14, color: t.dark ? pill.tint : pill.shade }]}>
          {pill.label}
        </Text>
      </View>
    </Animated.View>
  );
}

export function FeaturePills() {
  const { width } = useWindowDimensions();
  const compact = width < 360;
  return (
    <View
      accessible
      accessibilityLabel={A11Y_LABEL}
      style={[styles.cloud, { maxWidth: width - GUTTER * 2 }]}
    >
      {PILLS.map((pill, i) => (
        <FeaturePill key={pill.label} pill={pill} index={i} compact={compact} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // 8 pt of room on every side so the glow never clips.
  cloud: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingVertical: 8, alignSelf: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', paddingLeft: 5, paddingRight: 14, gap: 8, borderWidth: 1 },
  highlight: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  circle: { alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '500' },
});
