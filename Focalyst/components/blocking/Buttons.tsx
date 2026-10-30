import React, { useRef, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { haptics } from '../../src/blocking/haptics';

type IconName = ComponentProps<typeof Ionicons>['name'];

type PressScaleProps = {
  onPress?: () => void;
  /** Tapped while disabled: shakes and gives an error haptic (flow 10.2). */
  onDisabledPress?: () => void;
  disabled?: boolean;
  scale?: number;
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
  hitSlop?: number;
};

/** Press feedback shared by every tappable surface: 0.97 scale in 90 ms, spring back. */
export function PressScale({
  onPress,
  onDisabledPress,
  disabled,
  scale = 0.97,
  style,
  pressedStyle,
  children,
  accessibilityLabel,
  hitSlop,
}: PressScaleProps) {
  const value = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const pressIn = () => {
    if (disabled) return;
    Animated.timing(value, { toValue: scale, duration: 90, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    Animated.spring(value, { toValue: 1, damping: 14, stiffness: 300, useNativeDriver: true }).start();
  };
  const handlePress = () => {
    if (!disabled) return onPress?.();
    haptics.error();
    Animated.sequence(
      [4, -4, 4, -4, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 40, useNativeDriver: true }))
    ).start();
    onDisabledPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
    >
      {({ pressed }) => (
        <Animated.View style={[style, pressed && !disabled && pressedStyle, { transform: [{ scale: value }, { translateX: shake }] }]}>
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  onDisabledPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, onPress, onDisabledPress, disabled, loading, icon, style }: ButtonProps) {
  const { c } = useBlockingTheme();
  const fg = disabled ? c.textSecondary : c.onAccent;
  return (
    <PressScale
      onPress={() => {
        if (loading) return;
        haptics.light();
        onPress?.();
      }}
      onDisabledPress={onDisabledPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[
        styles.button,
        disabled
          ? { backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border }
          : { backgroundColor: c.accentFill },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={20} color={fg} />}
          <Text style={[type.buttonLabel, { color: fg }]}>{label}</Text>
        </View>
      )}
    </PressScale>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  icon,
  style,
  muted,
}: ButtonProps & { muted?: boolean }) {
  const { c } = useBlockingTheme();
  const fg = disabled ? c.textTertiary : muted ? c.textSecondary : c.textPrimary;
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[styles.button, { borderWidth: 1, borderColor: c.border }, style]}
      pressedStyle={{ backgroundColor: c.surface2 }}
    >
      <View style={styles.row}>
        {icon && <Ionicons name={icon} size={20} color={fg} />}
        <Text style={[styles.secondaryLabel, { color: fg }]}>{label}</Text>
      </View>
    </PressScale>
  );
}

export function TextButton({
  label,
  onPress,
  disabled,
  color,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useBlockingTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.textButton,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Text style={[styles.textLabel, { color: color ?? c.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

export function DangerTextButton({ label, onPress }: { label: string; onPress?: () => void }) {
  const { c } = useBlockingTheme();
  return <TextButton label={label} onPress={onPress} color={c.danger} />;
}

/** 40px circular icon button (close, back). */
export function CircleIconButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { c } = useBlockingTheme();
  return (
    <PressScale
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={[styles.circle, { backgroundColor: c.iconCircle }]}
    >
      <Ionicons name={icon} size={20} color={c.textPrimary} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryLabel: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  textButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  textLabel: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
