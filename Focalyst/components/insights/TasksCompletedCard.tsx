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

interface TasksCompletedCardProps {
  title: string;
  subtitle: string;
  tasksCompleted: number;
  tasksTotal: number;
  isDarkMode: boolean;
}

export function TasksCompletedCard({
  title,
  subtitle,
  tasksCompleted,
  tasksTotal,
  isDarkMode,
}: TasksCompletedCardProps) {
  const [size, setSize] = useState({ width: 350, height: 112 });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (Math.abs(width - size.width) > 1 || Math.abs(height - size.height) > 1)) {
      setSize({ width, height });
    }
  };

  const w = size.width;
  const h = size.height;
  const percent = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.card,
        isDarkMode ? styles.cardDark : styles.cardLight,
      ]}
    >
      {/* Base obsidian-charcoal (Dark) / rich emerald jewel-tone (Light) surface */}
      <LinearGradient
        colors={
          isDarkMode
            ? ['#0A0E14', '#0D1219', '#0F1722']
            : ['#065F46', '#047857', '#059669', '#10B981']
        }
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Concentrated emerald/mint-green bottom-center glow */}
      <Svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="emeraldBottomGlow" cx="50%" cy="105%" rx="72%" ry="55%">
            <Stop
              offset="0%"
              stopColor={isDarkMode ? '#6EE7B7' : '#A7F3D0'}
              stopOpacity={isDarkMode ? 0.48 : 0.52}
            />
            <Stop
              offset="35%"
              stopColor={isDarkMode ? '#34D399' : '#6EE7B7'}
              stopOpacity={isDarkMode ? 0.30 : 0.30}
            />
            <Stop
              offset="65%"
              stopColor={isDarkMode ? '#10B981' : '#34D399'}
              stopOpacity={isDarkMode ? 0.12 : 0.12}
            />
            <Stop
              offset="100%"
              stopColor={isDarkMode ? '#0A0E14' : '#10B981'}
              stopOpacity={0}
            />
          </RadialGradient>

          <SvgLinearGradient id="emeraldBottomRim" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop
              offset="0%"
              stopColor={isDarkMode ? '#059669' : '#6EE7B7'}
              stopOpacity={0}
            />
            <Stop
              offset="25%"
              stopColor={isDarkMode ? '#10B981' : '#A7F3D0'}
              stopOpacity={isDarkMode ? 0.45 : 0.55}
            />
            <Stop
              offset="50%"
              stopColor={isDarkMode ? '#6EE7B7' : '#ECFDF5'}
              stopOpacity={isDarkMode ? 0.85 : 0.90}
            />
            <Stop
              offset="75%"
              stopColor={isDarkMode ? '#10B981' : '#A7F3D0'}
              stopOpacity={isDarkMode ? 0.45 : 0.55}
            />
            <Stop
              offset="100%"
              stopColor={isDarkMode ? '#059669' : '#6EE7B7'}
              stopOpacity={0}
            />
          </SvgLinearGradient>
        </Defs>

        <Rect x={0} y={0} width={w} height={h} fill="url(#emeraldBottomGlow)" />
        <Rect x={0} y={h - 3} width={w} height={3} fill="url(#emeraldBottomRim)" />
      </Svg>

      {/* Left text column (exact copy & positions preserved) */}
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: '#FFFFFF' }]}>
          {title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDarkMode ? '#8E98AD' : 'rgba(255, 255, 255, 0.84)' },
          ]}
        >
          {subtitle}
        </Text>
        <Text
          style={[
            styles.valueRow,
            { color: isDarkMode ? '#94A3B8' : 'rgba(255, 255, 255, 0.84)' },
          ]}
        >
          <Text style={[styles.completedNum, { color: '#FFFFFF' }]}>
            {tasksCompleted}
          </Text>{' '}
          / {tasksTotal} tasks
        </Text>
      </View>

      {/* Right percentage display (vibrant emerald green in Dark, pure white in Light) */}
      <View style={styles.percentCol}>
        <Text
          style={[
            styles.percentText,
            { color: isDarkMode ? '#34D399' : '#FFFFFF' },
          ]}
        >
          {percent}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0A1530',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardDark: {
    backgroundColor: '#0A0E14',
    borderColor: 'rgba(16, 185, 129, 0.30)',
  },
  cardLight: {
    backgroundColor: '#047857',
    borderColor: 'rgba(167, 243, 208, 0.50)',
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
  },
  valueRow: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  completedNum: {
    fontSize: 24,
    fontWeight: '900',
  },
  percentCol: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 12,
  },
  percentText: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
  },
});
