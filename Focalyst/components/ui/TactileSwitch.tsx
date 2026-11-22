import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export interface TactileSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  isDarkMode: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function TactileSwitch({
  value,
  onValueChange,
  isDarkMode,
  disabled = false,
  accessibilityLabel,
  style,
}: TactileSwitchProps) {
  // Track: 48w x 28h, padding: 2. Thumb: 24w x 24h.
  // Travel distance = 48 - 24 - 4 = 20
  const travelDistance = 20;
  const slideAnim = useRef(new Animated.Value(value ? travelDistance : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: value ? travelDistance : 0,
      damping: 20,
      stiffness: 260,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [value, slideAnim]);

  const toggle = () => {
    if (disabled) return;
    try {
      Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore if haptics unavailable
    }
    onValueChange(!value);
  };

  // Light Mode:
  // OFF Track: #CBD5E1, Thumb: #FFFFFF with crisp elevation/shadow
  // ON Track: #1951fc, Thumb: #FFFFFF
  // Dark Mode:
  // OFF Track: #2A3244, Thumb: #E2E8F0
  // ON Track: #1951fc, Thumb: #FFFFFF
  const trackBg = value
    ? '#1951fc'
    : isDarkMode
      ? '#2A3244'
      : '#CBD5E1';

  const thumbBg = value
    ? '#FFFFFF'
    : isDarkMode
      ? '#E2E8F0'
      : '#FFFFFF';

  return (
    <Pressable
      onPress={toggle}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={[
        styles.track,
        {
          backgroundColor: trackBg,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: thumbBg,
            transform: [{ translateX: slideAnim }],
          },
          !value && !isDarkMode && styles.lightThumbShadow,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 2.5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  lightThumbShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#0A1530',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.22,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});
