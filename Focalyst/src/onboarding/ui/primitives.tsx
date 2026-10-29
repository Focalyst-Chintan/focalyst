import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, LinearGradient as SvgLinearGradient, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { useOnboardingTheme } from './theme';
import { haptics } from './haptics';

// ─── AmbientBackground (onboarding-only) ───────────────────────────────────────

export function AmbientBackground({ strong = false }: { strong?: boolean }) {
  const t = useOnboardingTheme();
  const a = (t.dark ? 0.32 : 0.16) * (strong ? 1.5 : 1);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.canvas }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="ambA" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#1951FC" stopOpacity={a} />
            <Stop offset="1" stopColor="#1951FC" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="ambB" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#3781FC" stopOpacity={a * 0.7} />
            <Stop offset="1" stopColor="#3781FC" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="15%" cy="12%" rx="75%" ry="38%" fill="url(#ambA)" />
        <Ellipse cx="95%" cy="70%" rx="70%" ry="35%" fill="url(#ambB)" />
      </Svg>
    </View>
  );
}

// ─── Glass card ────────────────────────────────────────────────────────────────

export function GlassCard({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const t = useOnboardingTheme();
  return (
    <View style={[{ backgroundColor: t.surface, borderColor: t.surfaceBorder, borderWidth: 1, borderRadius: 16 }, style]}>
      {children}
    </View>
  );
}

export function IconTile({ icon: Icon, size = 40, iconSize = 20 }: { icon: LucideIcon; size?: number; iconSize?: number }) {
  const t = useOnboardingTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: t.surfaceStrong,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={iconSize} color={t.primaryText} strokeWidth={2} />
    </View>
  );
}

// ─── Buttons ───────────────────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useOnboardingTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => (scale.value = withSpring(0.98, { damping: 20, stiffness: 400 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 20, stiffness: 400 }))}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={[styles.primaryShell, !disabled && styles.primaryGlow, pressStyle]}
    >
      {disabled ? (
        <View style={[styles.primaryFill, { backgroundColor: t.surfaceStrong }]}>
          <Text style={[styles.primaryLabel, { color: t.ink3 }]}>{label}</Text>
        </View>
      ) : (
        <LinearGradient colors={t.gradPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryFill}>
          <Text style={[styles.primaryLabel, { color: '#FFFFFF' }]}>{label}</Text>
        </LinearGradient>
      )}
    </AnimatedPressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useOnboardingTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.ghost, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.ghostLabel, { color: t.ink2 }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Gradient text (hero numbers and the group code only, 32 pt or larger) ─────

export function GradientText({
  text,
  fontSize,
  fontWeight = '700',
  colors,
  style,
}: {
  text: string;
  fontSize: number;
  fontWeight?: TextStyle['fontWeight'];
  colors?: [string, string];
  style?: StyleProp<TextStyle>;
}) {
  const t = useOnboardingTheme();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [from, to] = colors ?? t.gradLine;
  const textStyle: TextStyle = { fontSize, fontWeight, lineHeight: Math.round(fontSize * 1.15), letterSpacing: -1 };
  return (
    <View accessible accessibilityLabel={text}>
      {/* Invisible copy sets the box size; the SVG paints the gradient on top. */}
      <Text
        style={[textStyle, style, { opacity: 0 }]}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {text}
      </Text>
      {size && (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgLinearGradient id="gt" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </SvgLinearGradient>
          </Defs>
          <SvgText
            x={0}
            y={size.h / 2 + fontSize * 0.35}
            fill="url(#gt)"
            fontSize={fontSize}
            fontWeight={String(fontWeight)}
            letterSpacing={-1}
          >
            {text}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  primaryShell: { height: 56, borderRadius: 28 },
  primaryGlow: {
    shadowColor: '#1951FC',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryFill: { flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  primaryLabel: { fontSize: 17, fontWeight: '600' },
  ghost: { marginTop: 8, height: 44, alignItems: 'center', justifyContent: 'center' },
  ghostLabel: { fontSize: 16, fontWeight: '500' },
});
