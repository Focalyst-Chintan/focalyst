import React, { useEffect, useRef } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppTokenLabelView, isAvailable as nativeIconsAvailable, type PickerMode } from '../../modules/screen-time-blocker';
import { type, useBlockingTheme, useReduceMotion } from '../../constants/blockingTheme';
import { haptics } from '../../src/blocking/haptics';
import { useBlocking } from '../../src/blocking/BlockingContext';

const IS_ANDROID = Platform.OS === 'android';

type AppIconProps = {
  /** iOS: position in the saved selection. */
  index?: number;
  /** Android: the app's package; its cached icon comes from the installed-apps list. */
  packageName?: string;
  /** Android: icon file to use directly (skips the lookup). */
  iconUri?: string | null;
  size: number;
  mode?: PickerMode;
  /** Shows the lock badge. Pass an Animated value (0 to 1) to animate its scale. */
  locked?: boolean;
  badgeScale?: Animated.Value | Animated.AnimatedInterpolation<number>;
  /** Color behind the icon; draws the 2px ring around the badge. */
  ringColor?: string;
};

/**
 * A real app icon: the package's cached PNG on Android, the native Label(applicationToken) view on
 * iOS. Never a fake glyph; an empty tile stands in until the icon is known.
 */
export function AppIcon({ index = 0, packageName, iconUri, size, mode = 'blocklist', locked, badgeScale, ringColor }: AppIconProps) {
  const { c, isDark } = useBlockingTheme();
  const radius = size * 0.22;
  return (
    <View style={{ width: size, height: size }}>
      {IS_ANDROID ? (
        <AndroidIconImage packageName={packageName} iconUri={iconUri} size={size} radius={radius} />
      ) : (
        <AppTokenLabelView
          tokenIndex={index}
          mode={mode}
          size={size}
          colorScheme={isDark ? 'dark' : 'light'}
          style={{ width: size, height: size }}
        />
      )}
      {locked && (
        <Animated.View
          style={[
            styles.badge,
            {
              backgroundColor: c.accentFill,
              borderColor: ringColor ?? c.surface,
              transform: [{ scale: badgeScale ?? 1 }],
            },
          ]}
        >
          <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
        </Animated.View>
      )}
    </View>
  );
}

function AndroidIconImage({
  packageName,
  iconUri,
  size,
  radius,
}: {
  packageName?: string;
  iconUri?: string | null;
  size: number;
  radius: number;
}) {
  const { c } = useBlockingTheme();
  const { appInfo } = useBlocking();
  const uri = iconUri ?? (packageName ? appInfo(packageName)?.iconUri : null);
  if (!uri) return <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: c.surface2 }} />;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />;
}

type StripProps = {
  /** Number of selected app tokens. */
  count: number;
  size?: number;
  mode?: PickerMode;
  /** Lock badges on each icon. Toggling animates them on (70 ms stagger) or off (50 ms, reversed). */
  locked?: boolean;
  /** Pop the badges in on first mount instead of showing them settled. */
  animateOnMount?: boolean;
  ringColor?: string;
};

const MAX_ICONS = 5;

/** Up to 5 icons, 6px apart and never overlapping, then "+N" in caption. */
export function AppIconStrip({ count, size = 24, mode = 'blocklist', locked, animateOnMount, ringColor }: StripProps) {
  const { c } = useBlockingTheme();
  const reduceMotion = useReduceMotion();
  const { blockedPackages, allowedPackages } = useBlocking();
  // Android knows the actual packages; iOS only knows how many tokens were picked.
  const packages = IS_ANDROID ? (mode === 'allowed' ? allowedPackages : blockedPackages) : null;
  if (packages) count = packages.length;
  const shown = Math.min(count, MAX_ICONS);
  const extra = count - shown;

  const scales = useRef(Array.from({ length: MAX_ICONS }, () => new Animated.Value(0))).current;
  const firstRun = useRef(true);
  const [badgesVisible, setBadgesVisible] = React.useState(!!locked);

  useEffect(() => {
    const initial = firstRun.current;
    firstRun.current = false;
    const animate = !reduceMotion && (!initial || animateOnMount);

    if (locked) {
      setBadgesVisible(true);
      if (!animate) {
        scales.forEach((s) => s.setValue(1));
        return;
      }
      scales.forEach((s) => s.setValue(0));
      Animated.stagger(
        70,
        scales.slice(0, shown).map((s) =>
          Animated.sequence([
            Animated.timing(s, { toValue: 1.15, duration: 100, useNativeDriver: true }),
            Animated.timing(s, { toValue: 1, duration: 60, useNativeDriver: true }),
          ])
        )
      ).start();
      // Soft tick per badge, max 6.
      Array.from({ length: Math.min(shown, 6) }, (_, i) => setTimeout(haptics.soft, i * 70));
    } else {
      if (!animate) {
        scales.forEach((s) => s.setValue(0));
        setBadgesVisible(false);
        return;
      }
      Animated.stagger(
        50,
        scales
          .slice(0, shown)
          .reverse()
          .map((s) => Animated.timing(s, { toValue: 0, duration: 120, useNativeDriver: true }))
      ).start(() => setBadgesVisible(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  if (count <= 0) return null;

  // Native icons aren't in this build (Android, Expo Go): show the shield and the count instead.
  if (!nativeIconsAvailable) {
    return (
      <View style={styles.row}>
        <Ionicons name="shield-half-outline" size={size - 4} color={c.accent} />
        <Text style={[type.caption, type.tabular, { color: c.textSecondary }]}>{count}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row} accessibilityLabel={`${count} ${count === 1 ? 'app' : 'apps'}`}>
      {Array.from({ length: shown }, (_, i) => (
        <AppIcon
          key={packages?.[i] ?? i}
          index={i}
          packageName={packages?.[i]}
          size={size}
          mode={mode}
          locked={badgesVisible}
          badgeScale={scales[i]}
          ringColor={ringColor}
        />
      ))}
      {extra > 0 && <Text style={[type.caption, type.tabular, { color: c.textSecondary }]}>+{extra}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
