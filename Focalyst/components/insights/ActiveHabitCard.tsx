import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  PerimeterGlowBackground,
  getPerimeterCardTheme,
  hexToRgba,
} from './PerimeterGlowBackground';

interface ActiveHabitCardProps {
  id: string;
  name: string;
  icon?: string;
  color?: string | null;
  totalDaysLabel: string;
  isDarkMode: boolean;
}

export function ActiveHabitCard({
  name,
  icon,
  color,
  totalDaysLabel,
  isDarkMode,
}: ActiveHabitCardProps) {
  const { baseColor, backgroundColor, borderColor } = getPerimeterCardTheme(
    color,
    isDarkMode
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <PerimeterGlowBackground baseColor={baseColor} isDarkMode={isDarkMode} />

      {/* Circular Icon Badge */}
      <View
        style={[
          styles.iconBadge,
          isDarkMode
            ? {
                backgroundColor: hexToRgba(baseColor, 0.22),
                borderColor: hexToRgba(baseColor, 0.38),
              }
            : {
                backgroundColor: 'rgba(255, 255, 255, 0.20)',
                borderColor: 'rgba(255, 255, 255, 0.36)',
              },
        ]}
      >
        <Text style={styles.iconEmoji}>{icon || '🔥'}</Text>
      </View>

      {/* Dominant Bold Total Days */}
      <Text
        style={[
          styles.totalDays,
          { color: '#FFFFFF' },
        ]}
        numberOfLines={1}
      >
        {totalDaysLabel}
      </Text>

      {/* Secondary Habit Name */}
      <Text
        style={[
          styles.habitName,
          { color: isDarkMode ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.86)' },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    gap: 8,
    shadowColor: '#0A1530',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconEmoji: {
    fontSize: 22,
  },
  totalDays: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  habitName: {
    fontSize: 13.5,
    fontWeight: '400',
    textAlign: 'center',
  },
});
