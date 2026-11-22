import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutRectangle,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export interface SegmentedToggleOption<T = string> {
  label: string;
  value: T;
  locked?: boolean;
}

export interface SegmentedToggleProps<T = string> {
  options: SegmentedToggleOption<T>[];
  activeValue: T;
  onChange: (value: T) => void;
  isDarkMode: boolean;
  size?: 'header' | 'compact';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  trackBgColor?: string;
  trackBorderColor?: string;
  activePillColor?: string;
  activePillBorderColor?: string;
  activePillBorderWidth?: number;
  activeTextColorOverride?: string;
  inactiveTextColorOverride?: string;
}

export function SegmentedToggle<T = string>({
  options,
  activeValue,
  onChange,
  isDarkMode,
  size = 'compact',
  fullWidth = false,
  style,
  trackBgColor,
  trackBorderColor,
  activePillColor,
  activePillBorderColor,
  activePillBorderWidth,
  activeTextColorOverride,
  inactiveTextColorOverride,
}: SegmentedToggleProps<T>) {
  const [tabLayouts, setTabLayouts] = useState<Record<number, LayoutRectangle>>({});
  const activeIndex = Math.max(0, options.findIndex((opt) => opt.value === activeValue));

  const translateX = useRef(new Animated.Value(0)).current;
  const pillWidth = useRef(new Animated.Value(0)).current;
  const isInitialized = useRef(false);

  const isHeader = size === 'header';
  const trackHeight = isHeader ? 36 : 32;
  const pillHeight = isHeader ? 28 : 24;

  const onTabLayout = (index: number, layout: LayoutRectangle) => {
    setTabLayouts((prev) => {
      const next = { ...prev, [index]: layout };
      return next;
    });
  };

  useEffect(() => {
    const layout = tabLayouts[activeIndex];
    if (layout) {
      if (!isInitialized.current) {
        translateX.setValue(layout.x);
        pillWidth.setValue(layout.width);
        isInitialized.current = true;
      } else {
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: layout.x,
            damping: 20,
            stiffness: 260,
            mass: 0.8,
            useNativeDriver: false,
          }),
          Animated.spring(pillWidth, {
            toValue: layout.width,
            damping: 20,
            stiffness: 260,
            mass: 0.8,
            useNativeDriver: false,
          }),
        ]).start();
      }
    }
  }, [activeIndex, tabLayouts, translateX, pillWidth]);

  const handlePress = (option: SegmentedToggleOption<T>) => {
    try {
      Haptics.selectionAsync?.();
    } catch {
      // Ignore if haptics unavailable
    }
    onChange(option.value);
  };

  // Theme color tokens
  const trackBg = trackBgColor ?? (isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.35)');
  const trackBorder = trackBorderColor ?? (isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(10, 21, 48, 0.08)');
  const activePillBg = activePillColor ?? (isDarkMode ? 'rgba(255, 255, 255, 0.14)' : '#03195b');
  const activeTextColor = activeTextColorOverride ?? '#FFFFFF';
  const inactiveTextColor = inactiveTextColorOverride ?? (isDarkMode ? '#8E98AD' : '#0A1530');

  return (
    <View
      style={[
        styles.track,
        {
          height: trackHeight,
          backgroundColor: trackBg,
          borderColor: trackBorder,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          ...(fullWidth ? { width: '100%' } : {}),
        },
        style,
      ]}
    >
      {/* Sliding animated active pill indicator */}
      {isInitialized.current && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeIndicator,
            {
              height: pillHeight,
              backgroundColor: activePillBg,
              transform: [{ translateX }],
              width: pillWidth,
              ...(activePillBorderColor
                ? { borderColor: activePillBorderColor, borderWidth: activePillBorderWidth ?? 1 }
                : {}),
            },
          ]}
        />
      )}

      {options.map((option, index) => {
        const isActive = option.value === activeValue;
        return (
          <TouchableOpacity
            key={String(option.value)}
            onLayout={(e) => onTabLayout(index, e.nativeEvent.layout)}
            onPress={() => handlePress(option)}
            activeOpacity={0.8}
            style={[
              styles.tabButton,
              {
                height: pillHeight,
                paddingHorizontal: isHeader ? 14 : 10,
                ...(fullWidth ? { flex: 1 } : {}),
              },
              // Fallback background before layout measurement initializes
              !isInitialized.current && isActive && {
                backgroundColor: activePillBg,
                ...(activePillBorderColor
                  ? { borderColor: activePillBorderColor, borderWidth: activePillBorderWidth ?? 1 }
                  : {}),
              },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  fontSize: isHeader ? 12 : 11,
                  color: isActive ? activeTextColor : inactiveTextColor,
                  fontWeight: isActive ? '700' : '600',
                },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {option.locked && (
              <Ionicons
                name="lock-closed"
                size={isHeader ? 11 : 10}
                color={isActive ? activeTextColor : inactiveTextColor}
                style={styles.lockIcon}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    alignSelf: 'flex-start',
  },
  activeIndicator: {
    position: 'absolute',
    top: 3,
    left: 0,
    borderRadius: 999,
    zIndex: 0,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    zIndex: 1,
  },
  tabLabel: {
    letterSpacing: 0.4,
  },
  lockIcon: {
    marginLeft: 4,
    opacity: 0.85,
  },
});
