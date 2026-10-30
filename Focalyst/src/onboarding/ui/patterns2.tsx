import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Check, type LucideIcon } from 'lucide-react-native';
import { GlassCard } from './primitives';
import { haptics } from './haptics';
import { useOnboardingTheme } from './theme';

// Section 3.3 patterns used by screens 15 to 26.

// ─── Overline ──────────────────────────────────────────────────────────────────

export function Overline({ children, centered = false }: { children: string; centered?: boolean }) {
  const t = useOnboardingTheme();
  return (
    <Text style={[styles.overline, { color: t.primaryText }, centered && { textAlign: 'center' }]}>{children}</Text>
  );
}

// ─── Multi cards (square check, max enforced with a shake) ─────────────────────

export interface MultiOption {
  key: string;
  emoji: string;
  title: string;
}

export function MultiCards({
  options,
  selected,
  max,
  onToggle,
  renderExtra,
}: {
  options: MultiOption[];
  selected: string[];
  max: number;
  onToggle: (key: string) => void;
  /** Rendered under a selected card, for example the "Something else" field. */
  renderExtra?: (key: string) => React.ReactNode;
}) {
  const t = useOnboardingTheme();
  const reduceMotion = useReducedMotion();
  const shake = useSharedValue(0);
  const [warning, setWarning] = useState(false);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const press = (key: string) => {
    const isOn = selected.includes(key);
    if (!isOn && selected.length >= max) {
      haptics.warning();
      setWarning(true);
      if (!reduceMotion) {
        const d = 50;
        shake.value = withSequence(
          withTiming(-6, { duration: d }),
          withTiming(6, { duration: d }),
          withTiming(-6, { duration: d }),
          withTiming(6, { duration: d }),
          withTiming(0, { duration: d }),
        );
      }
      return;
    }
    setWarning(false);
    haptics.selection();
    onToggle(key);
  };

  return (
    <Animated.View style={shakeStyle}>
      <View style={styles.stack}>
        {options.map((option) => {
          const on = selected.includes(option.key);
          return (
            <View key={option.key}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={option.title}
                onPress={() => press(option.key)}
                style={({ pressed }) => [
                  styles.multi,
                  {
                    backgroundColor: on ? t.surfaceStrong : t.surface,
                    borderColor: on ? t.selectedBorder : t.surfaceBorder,
                    borderWidth: on ? 1.5 : 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.emoji}>{option.emoji}</Text>
                <Text style={[styles.multiTitle, { color: t.ink }]}>{option.title}</Text>
                {on ? (
                  <LinearGradient colors={t.gradPrimary} style={styles.square}>
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  </LinearGradient>
                ) : (
                  <View style={[styles.square, { borderWidth: 1.5, borderColor: t.ink3, opacity: 0.6 }]} />
                )}
              </Pressable>
              {on && renderExtra ? renderExtra(option.key) : null}
            </View>
          );
        })}
      </View>
      <Text style={[styles.warning, { color: warning ? t.primaryText : 'transparent' }]} accessibilityLiveRegion="polite">
        {warning ? `You can pick up to ${max}` : ' '}
      </Text>
    </Animated.View>
  );
}

// ─── Count-up (once; the countedUp flag stops replays) ─────────────────────────

export function useCountUp(target: number, durationMs: number, run: boolean): number {
  const [value, setValue] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationMs, run, target]);
  return value;
}

// ─── Stat tile ─────────────────────────────────────────────────────────────────

export function StatTile({ value, label }: { value: string; label: string }) {
  const t = useOnboardingTheme();
  return (
    <GlassCard style={styles.tile}>
      <Text style={[styles.tileValue, { color: t.ink }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: t.ink2 }]}>{label}</Text>
    </GlassCard>
  );
}

// ─── Trend chart (onboarding-only; draws once over 450 ms) ─────────────────────

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function TrendChart({
  values,
  highlightIndex,
  highlightLabel,
  animate,
}: {
  values: number[];
  highlightIndex: number;
  highlightLabel: string;
  animate: boolean;
}) {
  const t = useOnboardingTheme();
  const [width, setWidth] = useState(0);
  const height = 150;
  const padTop = 30;
  const padBottom = 22;
  const padX = 8;
  const max = Math.max(...values, 1);
  const x = (i: number) => padX + (i * (width - padX * 2)) / (values.length - 1);
  const y = (v: number) => padTop + (1 - v / max) * (height - padTop - padBottom);
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)},${height - padBottom} L${x(0).toFixed(1)},${height - padBottom} Z`;

  const LENGTH = 1200;
  const progress = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate && width > 0) progress.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [animate, progress, width]);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: LENGTH * (1 - progress.value) }));

  const hx = width > 0 ? x(highlightIndex) : 0;
  const hy = y(values[highlightIndex] ?? 0);
  const labelX = Math.min(Math.max(hx, 44), Math.max(44, width - 44));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height }}
      accessible
      accessibilityLabel={`Weekly focus hours for 12 weeks, from ${values[0]} to ${values[values.length - 1]}.`}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <SvgLinearGradient id="tcArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3781FC" stopOpacity={t.dark ? 0.35 : 0.22} />
              <Stop offset="1" stopColor="#3781FC" stopOpacity={0} />
            </SvgLinearGradient>
            <SvgLinearGradient id="tcLine" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={t.gradPrimary[0]} />
              <Stop offset="1" stopColor={t.gradPrimary[1]} />
            </SvgLinearGradient>
          </Defs>
          <Path d={area} fill="url(#tcArea)" />
          <AnimatedPath
            d={line}
            stroke="url(#tcLine)"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[LENGTH, LENGTH]}
            animatedProps={lineProps}
          />
          <Circle cx={hx} cy={hy} r={5} fill="#FFFFFF" stroke="#3781FC" strokeWidth={2.5} />
          <SvgText x={labelX} y={hy - 12} fill={t.ink} fontSize={12} fontWeight="600" textAnchor="middle">
            {highlightLabel}
          </SvgText>
          <SvgText x={x(0)} y={height - 4} fill={t.ink3} fontSize={11}>
            Week 1
          </SvgText>
          <SvgText x={x(values.length - 1)} y={height - 4} fill={t.ink3} fontSize={11} textAnchor="end">
            Week 12
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}

// ─── Loader (glass checklist ticking in sequence, with a progress ring) ────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function LoaderChecklist({ lines, stepMs }: { lines: string[]; stepMs: number }) {
  const t = useOnboardingTheme();
  const [done, setDone] = useState(0);
  const ring = useSharedValue(0);
  const R = 34;
  const C = 2 * Math.PI * R;

  useEffect(() => {
    ring.value = withTiming(1, { duration: stepMs * lines.length, easing: Easing.linear });
    const timers = lines.map((_, i) => setTimeout(() => setDone(i + 1), stepMs * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [lines, ring, stepMs]);
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - ring.value) }));

  return (
    <View style={styles.loader}>
      <Svg width={88} height={88} accessibilityElementsHidden>
        <Circle cx={44} cy={44} r={R} stroke={t.surfaceStrong} strokeWidth={6} fill="none" />
        <AnimatedCircle
          cx={44}
          cy={44}
          r={R}
          stroke="#3781FC"
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={[C, C]}
          animatedProps={ringProps}
          rotation={-90}
          origin="44, 44"
        />
      </Svg>
      <GlassCard style={styles.checklist}>
        {lines.map((line, i) => {
          const isDone = i < done;
          return (
            <View key={line} style={styles.checkRow} accessibilityLabel={`${line}${isDone ? ', done' : ''}`}>
              {isDone ? (
                <Animated.View entering={FadeIn.duration(200)}>
                  <LinearGradient colors={t.gradPrimary} style={styles.tick}>
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  </LinearGradient>
                </Animated.View>
              ) : (
                <View style={[styles.tick, { borderWidth: 1.5, borderColor: t.ink3, opacity: 0.5 }]} />
              )}
              <Text style={[styles.checkText, { color: isDone ? t.ink : t.ink3 }]}>{line}</Text>
            </View>
          );
        })}
      </GlassCard>
    </View>
  );
}

// ─── Permission primer ─────────────────────────────────────────────────────────

export function PrimerHeader({ icon: Icon, title, lines }: { icon: LucideIcon; title: string; lines: React.ReactNode[] }) {
  const t = useOnboardingTheme();
  return (
    <View>
      <View style={styles.primerIconWrap}>
        <LinearGradient colors={t.gradPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primerIcon}>
          <Icon size={44} color="#FFFFFF" strokeWidth={1.8} />
        </LinearGradient>
      </View>
      <Text accessibilityRole="header" style={[styles.primerTitle, { color: t.ink }]}>
        {title}
      </Text>
      <View style={styles.primerLines}>
        {lines.map((line, i) => (
          <View key={i} style={styles.primerLine}>
            <View style={[styles.tick, { backgroundColor: t.surfaceStrong }]}>
              <Check size={12} color={t.primaryText} strokeWidth={3} />
            </View>
            <View style={{ flex: 1 }}>
              {typeof line === 'string' ? <Text style={[styles.primerText, { color: t.ink2 }]}>{line}</Text> : line}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overline: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 10 },
  stack: { gap: 10 },
  multi: { minHeight: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  emoji: { fontSize: 22, width: 30, textAlign: 'center' },
  multiTitle: { flex: 1, fontSize: 16, fontWeight: '600' },
  square: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  warning: { fontSize: 14, fontWeight: '500', marginTop: 12 },
  tile: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16 },
  tileValue: { fontSize: 22, fontWeight: '700' },
  tileLabel: { fontSize: 13, marginTop: 2 },
  loader: { alignItems: 'center', gap: 28 },
  checklist: { alignSelf: 'stretch', padding: 18, gap: 16, borderRadius: 20 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tick: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 16, flex: 1 },
  primerIconWrap: { alignItems: 'center', marginBottom: 24 },
  primerIcon: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  primerTitle: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  primerLines: { marginTop: 24, gap: 14 },
  primerLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  primerText: { fontSize: 16, lineHeight: 22 },
});
