import React, { useEffect, useRef, type ComponentProps } from 'react';
import { Animated, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { cardShadow, type, useBlockingTheme, useReduceMotion } from '../../constants/blockingTheme';
import { haptics } from '../../src/blocking/haptics';
import { PressScale } from './Buttons';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** 22px radio: 1.5px border ring, or 2px accent ring with a 10px dot. */
export function Radio({ selected }: { selected: boolean }) {
  const { c } = useBlockingTheme();
  return (
    <View
      style={[
        styles.radio,
        selected ? { borderWidth: 2, borderColor: c.accent } : { borderWidth: 1.5, borderColor: c.border },
      ]}
    >
      {selected && <View style={[styles.radioDot, { backgroundColor: c.accent }]} />}
    </View>
  );
}

/** 24px circular checkbox: 1.5px border ring, or accent fill + white check. Pops 0.85 → 1.1 → 1 on toggle. */
export function Checkbox({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  const { c } = useBlockingTheme();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduceMotion) return;
    scale.setValue(0.85);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.1, duration: 90, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [checked, reduceMotion, scale]);

  return (
    <Animated.View
      style={[
        styles.checkbox,
        checked ? { backgroundColor: c.accent } : { borderWidth: 1.5, borderColor: c.border },
        disabled && { opacity: 0.4 },
        { transform: [{ scale }] },
      ]}
    >
      {checked && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
    </Animated.View>
  );
}

/** Selected: accentTint fill, 2px accent border. The label never fades. */
export function SelectOption({
  selected,
  onPress,
  locked,
  onLockedPress,
  children,
  style,
}: {
  selected: boolean;
  onPress: () => void;
  /** Ratchet: shown at 50% with a lock; tapping explains why. */
  locked?: boolean;
  onLockedPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useBlockingTheme();
  return (
    <PressScale
      scale={0.98}
      disabled={locked}
      onDisabledPress={onLockedPress}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[
        styles.option,
        selected
          ? { backgroundColor: c.accentTint, borderWidth: 2, borderColor: c.accent }
          : { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, margin: 1 },
        locked && { opacity: 0.5 },
        style,
      ]}
    >
      {children}
    </PressScale>
  );
}

/** Card with an overline label 16px inside the top edge. */
export function SettingsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const { c, isDark } = useBlockingTheme();
  return (
    <View style={[styles.group, cardShadow(isDark), { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[type.overline, styles.groupLabel, { color: c.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

export function GroupDivider() {
  const { c } = useBlockingTheme();
  return <View style={[styles.divider, { backgroundColor: c.border }]} />;
}

type RowProps = {
  title: string;
  subtitle?: string;
  /** Left content before the title (icons, strips). */
  leading?: React.ReactNode;
  value?: React.ReactNode;
  chevron?: boolean;
  locked?: boolean;
  onPress?: () => void;
  onLockedPress?: () => void;
};

/** 56-tall settings row. Locked rows sit at 50% with a small lock (the ratchet). */
export function SettingsRow({ title, subtitle, leading, value, chevron, locked, onPress, onLockedPress }: RowProps) {
  const { c } = useBlockingTheme();
  const content = (
    <View style={[styles.row, locked && { opacity: 0.5 }]}>
      {leading}
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: c.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={[type.caption, { color: c.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      <View style={styles.rowValue}>
        {typeof value === 'string' ? <Text style={[type.secondary, { color: c.textSecondary }]}>{value}</Text> : value}
        {locked && <Ionicons name="lock-closed" size={14} color={c.textSecondary} />}
        {chevron && <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />}
      </View>
    </View>
  );
  if (!onPress && !onLockedPress) return content;
  return (
    <PressScale scale={0.98} disabled={locked} onPress={onPress} onDisabledPress={onLockedPress} accessibilityLabel={title}>
      {content}
    </PressScale>
  );
}

export function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
  locked,
  onLockedPress,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  locked?: boolean;
  onLockedPress?: () => void;
}) {
  const { c, isDark } = useBlockingTheme();
  return (
    <View style={[styles.row, locked && { opacity: 0.5 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: c.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={[type.caption, { color: c.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {locked && <Ionicons name="lock-closed" size={14} color={c.textSecondary} />}
      <Switch
        value={value}
        onValueChange={(v) => {
          if (locked) {
            haptics.error();
            onLockedPress?.();
            return;
          }
          haptics.selection();
          onChange(v);
        }}
        trackColor={{ false: isDark ? '#222D47' : '#cbd5e1', true: c.accent }}
        thumbColor="#FFFFFF"
        accessibilityLabel={title}
      />
    </View>
  );
}

/** Banner: radius 14, padding 12/16, accentTint fill. */
export function Banner({ icon, text, action }: { icon: IconName; text: string; action?: React.ReactNode }) {
  const { c } = useBlockingTheme();
  return (
    <View style={[styles.banner, { backgroundColor: c.accentTint }]}>
      <Ionicons name={icon} size={20} color={c.accent} />
      <Text style={[type.bodyStrong, { color: c.textPrimary, flex: 1 }]}>{text}</Text>
      {action}
    </View>
  );
}

export function IconCircle({ icon, size = 40, color }: { icon: IconName; size?: number; color?: string }) {
  const { c } = useBlockingTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.iconCircle,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={size / 2} color={color ?? c.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  radio: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  checkbox: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  option: { borderRadius: 20, padding: 16 },
  group: { borderRadius: 24, borderWidth: 1, paddingTop: 16, paddingBottom: 4 },
  groupLabel: { paddingHorizontal: 20, marginBottom: 4 },
  divider: { height: 1, marginLeft: 20 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 8 },
  rowValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  banner: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
