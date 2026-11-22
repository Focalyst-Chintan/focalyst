import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from 'react-native-svg';

interface TotalFocusTimeCardProps {
  formattedTime: string;
  label: string;
  deltaText?: string;
  isDarkMode: boolean;
}

export function TotalFocusTimeCard({
  formattedTime,
  label,
  deltaText = '-9%',
  isDarkMode,
}: TotalFocusTimeCardProps) {
  const [size, setSize] = useState({ width: 170, height: 124 });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (Math.abs(width - size.width) > 1 || Math.abs(height - size.height) > 1)) {
      setSize({ width, height });
    }
  };

  const w = size.width;
  const h = size.height;

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.card,
        isDarkMode ? styles.cardDark : styles.cardLight,
      ]}
    >
      {/* Smooth purple base gradient */}
      <LinearGradient
        colors={
          isDarkMode
            ? ['#0B0719', '#100A24', '#160D33']
            : ['#5B21B6', '#7C3AED', '#8B5CF6']
        }
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Luminous purple bottom rim glow */}
      <Svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          {/* Bottom-edge & lower-corner radial glow */}
          <RadialGradient id="purpleBottomGlow" cx="50%" cy="102%" rx="72%" ry="46%">
            <Stop
              offset="0%"
              stopColor={isDarkMode ? '#C4B5FD' : '#DDD6FE'}
              stopOpacity={isDarkMode ? 0.55 : 0.5}
            />
            <Stop
              offset="38%"
              stopColor={isDarkMode ? '#8B5CF6' : '#C4B5FD'}
              stopOpacity={isDarkMode ? 0.36 : 0.3}
            />
            <Stop
              offset="72%"
              stopColor={isDarkMode ? '#6D28D9' : '#8B5CF6'}
              stopOpacity={isDarkMode ? 0.15 : 0.1}
            />
            <Stop
              offset="100%"
              stopColor={isDarkMode ? '#0B0719' : '#7C3AED'}
              stopOpacity={0}
            />
          </RadialGradient>

          {/* Soft top ambient depth */}
          <RadialGradient id="purpleTopGlow" cx="50%" cy="0%" rx="60%" ry="35%">
            <Stop
              offset="0%"
              stopColor={isDarkMode ? '#6D28D9' : '#A78BFA'}
              stopOpacity={isDarkMode ? 0.18 : 0.16}
            />
            <Stop
              offset="100%"
              stopColor={isDarkMode ? '#0B0719' : '#5B21B6'}
              stopOpacity={0}
            />
          </RadialGradient>

          {/* Inner lavender-purple bottom rim highlight */}
          <SvgLinearGradient id="purpleBottomRim" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop
              offset="0%"
              stopColor={isDarkMode ? '#6D28D9' : '#8B5CF6'}
              stopOpacity={0}
            />
            <Stop
              offset="25%"
              stopColor={isDarkMode ? '#8B5CF6' : '#C4B5FD'}
              stopOpacity={isDarkMode ? 0.48 : 0.55}
            />
            <Stop
              offset="50%"
              stopColor={isDarkMode ? '#EDE9FE' : '#F5F3FF'}
              stopOpacity={isDarkMode ? 0.85 : 0.9}
            />
            <Stop
              offset="75%"
              stopColor={isDarkMode ? '#8B5CF6' : '#C4B5FD'}
              stopOpacity={isDarkMode ? 0.48 : 0.55}
            />
            <Stop
              offset="100%"
              stopColor={isDarkMode ? '#6D28D9' : '#8B5CF6'}
              stopOpacity={0}
            />
          </SvgLinearGradient>
        </Defs>

        <Rect x={0} y={0} width={w} height={h} fill="url(#purpleTopGlow)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#purpleBottomGlow)" />
        <Rect x={0} y={h - 3} width={w} height={3} fill="url(#purpleBottomRim)" />
      </Svg>

      {/* Top-right delta pill badge (preserved exact styling & position) */}
      {!!deltaText && (
        <View style={styles.comparisonBadge}>
          <Text style={styles.comparisonText}>{deltaText}</Text>
        </View>
      )}

      {/* Lower-anchored text block aligned horizontally with ProductivityScoreCard */}
      <View style={styles.textStack}>
        <Text style={[styles.value, { color: '#FFFFFF' }]} numberOfLines={1}>
          {formattedTime}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            { color: isDarkMode ? '#A5B4FC' : 'rgba(237, 233, 254, 0.88)' },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 120,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 58,
    shadowColor: '#0A1530',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardDark: {
    backgroundColor: '#0B0719',
    borderColor: 'rgba(139, 92, 246, 0.38)',
  },
  cardLight: {
    backgroundColor: '#7C3AED',
    borderColor: 'rgba(196, 181, 253, 0.5)',
  },
  comparisonBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#fee2e2',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    zIndex: 5,
  },
  comparisonText: {
    fontSize: 10,
    color: '#ef4444',
    fontWeight: '700',
  },
  textStack: {
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: -0.1,
  },
});
