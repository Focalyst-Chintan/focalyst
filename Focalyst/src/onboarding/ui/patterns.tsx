import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Check, type LucideIcon } from 'lucide-react-native';
import { GlassCard, GradientText, IconTile } from './primitives';
import { haptics } from './haptics';
import { type, useOnboardingTheme } from './theme';

// Section 3.3 patterns used by screens 1 to 14.

// ─── Titles ────────────────────────────────────────────────────────────────────

export function Title({ children, centered = false }: { children: React.ReactNode; centered?: boolean }) {
  const t = useOnboardingTheme();
  return (
    <Text accessibilityRole="header" style={[type.title, { color: t.ink }, centered && styles.center]}>
      {children}
    </Text>
  );
}

export function Subtitle({ children, centered = false }: { children: React.ReactNode; centered?: boolean }) {
  const t = useOnboardingTheme();
  return <Text style={[type.subtitle, styles.subtitle, { color: t.ink2 }, centered && styles.center]}>{children}</Text>;
}

/** A centred title and line, for statement screens. */
export function Statement({ title, line }: { title: string; line?: string }) {
  return (
    <View>
      <Title centered>{title}</Title>
      {line ? <Subtitle centered>{line}</Subtitle> : null}
    </View>
  );
}

// ─── Benefit cards ─────────────────────────────────────────────────────────────

export interface Benefit {
  icon: LucideIcon;
  title: string;
  line: string;
}

export function BenefitCards({ items }: { items: Benefit[] }) {
  const t = useOnboardingTheme();
  const reduceMotion = useReducedMotion();
  return (
    <View style={styles.stack}>
      {items.map((item, i) => (
        <Animated.View key={item.title} entering={FadeIn.duration(reduceMotion ? 120 : 320).delay(reduceMotion ? 0 : i * 60)}>
          <GlassCard style={styles.benefit}>
            <IconTile icon={item.icon} />
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, { color: t.ink }]}>{item.title}</Text>
              <Text style={[styles.cardLine, { color: t.ink2 }]}>{item.line}</Text>
            </View>
          </GlassCard>
        </Animated.View>
      ))}
    </View>
  );
}

// ─── Single choice ─────────────────────────────────────────────────────────────

export interface ChoiceOption<T extends string | number> {
  value: T;
  title: string;
  line?: string;
  icon?: LucideIcon;
}

function CheckCircle({ on }: { on: boolean }) {
  const t = useOnboardingTheme();
  return on ? (
    <LinearGradient colors={t.gradPrimary} style={styles.checkCircle}>
      <Check size={14} color="#FFFFFF" strokeWidth={3} />
    </LinearGradient>
  ) : (
    <View style={[styles.checkCircle, { borderWidth: 1.5, borderColor: t.ink3, opacity: 0.6 }]} />
  );
}

/**
 * Tap selects, selection haptic, then auto-advances after 250 ms. Without onAdvance it's the
 * "choice with follow-up" pattern: no auto-advance, and the chosen card shows renderExtra.
 */
export function SingleChoice<T extends string | number>({
  options,
  value,
  onSelect,
  onAdvance,
  renderExtra,
}: {
  options: ChoiceOption<T>[];
  value: T | undefined;
  onSelect: (value: T) => void;
  onAdvance?: () => void;
  renderExtra?: (value: T) => React.ReactNode;
}) {
  const t = useOnboardingTheme();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <View style={styles.stack} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        const extra = selected && renderExtra ? renderExtra(option.value) : null;
        return (
          <View key={String(option.value)}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.line ? `${option.title}. ${option.line}` : option.title}
            onPress={() => {
              haptics.selection();
              onSelect(option.value);
              if (!onAdvance) return;
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(onAdvance, 250);
            }}
            style={({ pressed }) => [
              styles.choice,
              {
                backgroundColor: selected ? t.surfaceStrong : t.surface,
                borderColor: selected ? t.selectedBorder : t.surfaceBorder,
                borderWidth: selected ? 1.5 : 1,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {option.icon ? <IconTile icon={option.icon} /> : null}
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, { color: t.ink }]}>{option.title}</Text>
              {option.line ? <Text style={[styles.cardLine, { color: t.ink2 }]}>{option.line}</Text> : null}
            </View>
            <CheckCircle on={selected} />
          </Pressable>
          {extra ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.extra}>
              {extra}
            </Animated.View>
          ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ─── Chips ─────────────────────────────────────────────────────────────────────

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress?: () => void }) {
  const t = useOnboardingTheme();
  const body = (
    <>
      {selected ? <Check size={16} color="#FFFFFF" strokeWidth={2.5} /> : null}
      <Text style={[styles.chipLabel, { color: selected ? '#FFFFFF' : t.ink }]}>{label}</Text>
    </>
  );
  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={onPress ? { checked: selected } : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      {selected ? (
        <LinearGradient colors={t.gradPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
          {body}
        </LinearGradient>
      ) : (
        <View style={[styles.chip, { backgroundColor: t.surface, borderColor: t.surfaceBorder, borderWidth: 1 }]}>
          {body}
        </View>
      )}
    </Pressable>
  );
}

export function Chips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (next: string[]) => void }) {
  const t = useOnboardingTheme();
  return (
    <View>
      <View style={styles.chipWrap}>
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <Chip
              key={option}
              label={option}
              selected={selected}
              onPress={() => {
                haptics.selection();
                // Keep the order of picking: the report uses the first ones.
                onChange(selected ? value.filter((v) => v !== option) : [...value, option]);
              }}
            />
          );
        })}
      </View>
      <Text style={[styles.counter, { color: t.ink3 }]} accessibilityLiveRegion="polite">
        {value.length > 0 ? `${value.length} selected` : ' '}
      </Text>
    </View>
  );
}

// ─── Text input ────────────────────────────────────────────────────────────────

export function TextField(props: TextInputProps) {
  const t = useOnboardingTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={t.ink3}
      selectionColor={t.primary}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[
        styles.field,
        {
          color: t.ink,
          backgroundColor: t.surface,
          borderColor: focused ? t.selectedBorder : t.surfaceBorder,
          borderWidth: focused ? 1.5 : 1,
        },
        props.style,
      ]}
    />
  );
}

// ─── Phone hours slider ────────────────────────────────────────────────────────

const MIN_H = 1;
const MAX_H = 10;
const STEP_H = 0.5;
const THUMB = 28;

export function formatHours(value: number) {
  return value >= MAX_H ? '10+' : String(value);
}

export function PhoneHoursSlider({
  value,
  moved,
  onChange,
}: {
  value: number;
  /** Before the first move the value shows in ink-3 and Continue stays disabled. */
  moved: boolean;
  onChange: (value: number) => void;
}) {
  const t = useOnboardingTheme();
  const [width, setWidth] = useState(0);
  const last = useRef(value);
  last.current = value;

  const track = Math.max(1, width - THUMB);
  const ratio = (value - MIN_H) / (MAX_H - MIN_H);

  const update = (x: number) => {
    const r = Math.min(1, Math.max(0, (x - THUMB / 2) / track));
    const next = Math.round((MIN_H + r * (MAX_H - MIN_H)) / STEP_H) * STEP_H;
    if (next !== last.current || !moved) {
      if (next !== last.current && Number.isInteger(next)) haptics.selection();
      last.current = next;
      onChange(next);
    }
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => update(e.x))
    .onUpdate((e) => update(e.x));

  const label = formatHours(value);
  const unit = value === 1 ? 'hour a day' : 'hours a day';

  return (
    <View>
      <View style={styles.sliderValue}>
        {moved ? (
          <GradientText text={label} fontSize={56} />
        ) : (
          <Text style={[styles.sliderNumber, { color: t.ink3 }]}>{label}</Text>
        )}
        <Text style={[styles.sliderUnit, { color: t.ink2 }]}>{unit}</Text>
      </View>
      <GestureDetector gesture={pan}>
        <View
          style={styles.sliderHit}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Hours on your phone each day"
          accessibilityValue={{ text: `${label} ${unit}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const delta = e.nativeEvent.actionName === 'increment' ? STEP_H : -STEP_H;
            onChange(Math.min(MAX_H, Math.max(MIN_H, value + delta)));
          }}
        >
          <View style={[styles.sliderTrack, { backgroundColor: t.surfaceStrong }]}>
            <LinearGradient
              colors={t.gradPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.sliderFill, { width: THUMB / 2 + ratio * track, opacity: moved ? 1 : 0.4 }]}
            />
          </View>
          <View
            style={[
              styles.thumb,
              { left: ratio * track, backgroundColor: '#FFFFFF', borderColor: t.selectedBorder },
            ]}
          />
        </View>
      </GestureDetector>
      <View style={styles.sliderEnds}>
        <Text style={[styles.cardLine, { color: t.ink3 }]}>1 h</Text>
        <Text style={[styles.cardLine, { color: t.ink3 }]}>10+ h</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  subtitle: { marginTop: 10 },
  stack: { gap: 12 },
  benefit: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', lineHeight: 21 },
  cardLine: { fontSize: 14, lineHeight: 19, marginTop: 2 },
  choice: {
    minHeight: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  extra: { paddingTop: 12, paddingHorizontal: 4, gap: 10 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { height: 44, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipLabel: { fontSize: 15, fontWeight: '500' },
  counter: { fontSize: 14, marginTop: 14 },
  field: { height: 60, borderRadius: 16, paddingHorizontal: 18, fontSize: 20, fontWeight: '500' },
  sliderValue: { alignItems: 'center', marginBottom: 28, minHeight: 92, justifyContent: 'center' },
  sliderNumber: { fontSize: 56, lineHeight: 64, fontWeight: '700', letterSpacing: -1 },
  sliderUnit: { fontSize: 16, marginTop: 2 },
  sliderHit: { height: 44, justifyContent: 'center' },
  sliderTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  sliderFill: { height: 8, borderRadius: 4 },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sliderEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});
