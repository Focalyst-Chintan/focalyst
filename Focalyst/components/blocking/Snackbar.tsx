import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardShadow, type, useBlockingTheme } from '../../constants/blockingTheme';

const BOTTOM_NAV_HEIGHT = 60;

/** S13e. Slides up 16px + fades in, auto-hides after 3 s. */
export function Snackbar({ message, onHide }: { message: string | null; onHide: () => void }) {
  const { c, isDark } = useBlockingTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    const id = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onHide());
    }, 3000);
    return () => clearTimeout(id);
  }, [message, anim, onHide]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.wrap,
        cardShadow(isDark),
        {
          bottom: insets.bottom + BOTTOM_NAV_HEIGHT + 16,
          backgroundColor: c.snackbar,
          borderColor: c.border,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <Text style={[type.secondary, { color: c.textPrimary }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 10000,
    elevation: 12,
  },
});
