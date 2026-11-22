import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
  Path,
  Circle,
  Rect,
} from 'react-native-svg';

interface ProductivityScoreCardProps {
  score: number;
  label: string;
  isDarkMode: boolean;
  isLocked?: boolean;
  lockedOverlay?: React.ReactNode;
}

export function ProductivityScoreCard({
  score,
  label,
  isDarkMode,
  isLocked = false,
  lockedOverlay,
}: ProductivityScoreCardProps) {
  const [size, setSize] = useState({ width: 170, height: 124 });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (Math.abs(width - size.width) > 1 || Math.abs(height - size.height) > 1)) {
      setSize({ width, height });
    }
  };

  const clampedScore = Math.max(0, Math.min(100, Number.isFinite(score) ? Math.round(score) : 0));
  const t = clampedScore / 100;

  const w = size.width;
  const h = size.height;

  // Chart region in the upper half of the card
  const yTop = Math.max(14, h * 0.13);
  const yBottom = Math.max(yTop + 26, h * 0.44);
  const yMid = (yTop + yBottom) * 0.5;

  // Score maps linearly from lower trough (0%) through centerline (50%) to upper crest (100%)
  const dotX = w * 0.5;
  const dotY = yBottom - t * (yBottom - yTop);
  const delta = dotY - yMid; // > 0 for low scores (trough), < 0 for high scores (crest)

  // Subtle counter-wave shoulders; near 50% keep a gentle organic undulation
  const flankOffset = Math.abs(delta) < 2 ? 2.5 : -delta * 0.2;
  const yEntry = yMid;
  const yLeftShoulder = yMid + flankOffset;
  const yRightShoulder = yMid - (Math.abs(delta) < 2 ? flankOffset : -flankOffset);
  const yExit = yMid;

  // Smooth C1-continuous sine-like cubic-bezier curve with horizontal tangent at (dotX, dotY)
  const curvePath = [
    `M 0 ${yEntry.toFixed(1)}`,
    `C ${(w * 0.1).toFixed(1)} ${yEntry.toFixed(1)}, ${(w * 0.16).toFixed(1)} ${yLeftShoulder.toFixed(1)}, ${(w * 0.24).toFixed(1)} ${yLeftShoulder.toFixed(1)}`,
    `C ${(w * 0.34).toFixed(1)} ${yLeftShoulder.toFixed(1)}, ${(w * 0.4).toFixed(1)} ${dotY.toFixed(1)}, ${dotX.toFixed(1)} ${dotY.toFixed(1)}`,
    `C ${(w * 0.6).toFixed(1)} ${dotY.toFixed(1)}, ${(w * 0.66).toFixed(1)} ${yRightShoulder.toFixed(1)}, ${(w * 0.76).toFixed(1)} ${yRightShoulder.toFixed(1)}`,
    `C ${(w * 0.84).toFixed(1)} ${yRightShoulder.toFixed(1)}, ${(w * 0.9).toFixed(1)} ${yExit.toFixed(1)}, ${w.toFixed(1)} ${yExit.toFixed(1)}`,
  ].join(' ');

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.card,
        isDarkMode ? styles.cardDark : styles.cardLight,
      ]}
    >
      {/* Smooth base gradient (no grid pattern) */}
      <LinearGradient
        colors={
          isDarkMode
            ? ['#060B19', '#081024', '#0A1738']
            : ['#1E40AF', '#2563EB', '#3B82F6']
        }
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {isLocked && lockedOverlay ? (
        lockedOverlay
      ) : (
        <>
          {/* Cobalt rim glow + score-responsive sine curve + glowing dot */}
          <Svg
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Defs>
              {/* Bottom-edge & lower-corner radial glow */}
              <RadialGradient id="bottomGlow" cx="50%" cy="102%" rx="72%" ry="46%">
                <Stop
                  offset="0%"
                  stopColor={isDarkMode ? '#60A5FA' : '#93C5FD'}
                  stopOpacity={isDarkMode ? 0.58 : 0.48}
                />
                <Stop
                  offset="38%"
                  stopColor={isDarkMode ? '#3B82F6' : '#60A5FA'}
                  stopOpacity={isDarkMode ? 0.36 : 0.26}
                />
                <Stop
                  offset="72%"
                  stopColor={isDarkMode ? '#1D4ED8' : '#3B82F6'}
                  stopOpacity={isDarkMode ? 0.14 : 0.08}
                />
                <Stop
                  offset="100%"
                  stopColor={isDarkMode ? '#060B19' : '#2563EB'}
                  stopOpacity={0}
                />
              </RadialGradient>

              {/* Soft top ambient depth */}
              <RadialGradient id="topGlow" cx="50%" cy="0%" rx="60%" ry="35%">
                <Stop
                  offset="0%"
                  stopColor={isDarkMode ? '#2563EB' : '#60A5FA'}
                  stopOpacity={isDarkMode ? 0.18 : 0.14}
                />
                <Stop
                  offset="100%"
                  stopColor={isDarkMode ? '#060B19' : '#1E40AF'}
                  stopOpacity={0}
                />
              </RadialGradient>

              {/* Inner icy-blue bottom rim highlight */}
              <SvgLinearGradient id="bottomRim" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop
                  offset="0%"
                  stopColor={isDarkMode ? '#3B82F6' : '#60A5FA'}
                  stopOpacity={0}
                />
                <Stop
                  offset="25%"
                  stopColor={isDarkMode ? '#60A5FA' : '#93C5FD'}
                  stopOpacity={isDarkMode ? 0.45 : 0.55}
                />
                <Stop
                  offset="50%"
                  stopColor={isDarkMode ? '#E0F2FE' : '#E0F2FE'}
                  stopOpacity={isDarkMode ? 0.8 : 0.9}
                />
                <Stop
                  offset="75%"
                  stopColor={isDarkMode ? '#60A5FA' : '#93C5FD'}
                  stopOpacity={isDarkMode ? 0.45 : 0.55}
                />
                <Stop
                  offset="100%"
                  stopColor={isDarkMode ? '#3B82F6' : '#60A5FA'}
                  stopOpacity={0}
                />
              </SvgLinearGradient>

              {/* Curve stroke horizontal gradient */}
              <SvgLinearGradient id="curveStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop
                  offset="0%"
                  stopColor={isDarkMode ? '#3B82F6' : '#BAE6FD'}
                  stopOpacity={0}
                />
                <Stop
                  offset="22%"
                  stopColor={isDarkMode ? '#60A5FA' : '#BAE6FD'}
                  stopOpacity={isDarkMode ? 0.55 : 0.65}
                />
                <Stop
                  offset="50%"
                  stopColor={isDarkMode ? '#7DD3FC' : '#FFFFFF'}
                  stopOpacity={1}
                />
                <Stop
                  offset="78%"
                  stopColor={isDarkMode ? '#60A5FA' : '#BAE6FD'}
                  stopOpacity={isDarkMode ? 0.55 : 0.65}
                />
                <Stop
                  offset="100%"
                  stopColor={isDarkMode ? '#3B82F6' : '#BAE6FD'}
                  stopOpacity={0}
                />
              </SvgLinearGradient>

              {/* Curve outer glow gradient */}
              <SvgLinearGradient id="curveGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop
                  offset="0%"
                  stopColor={isDarkMode ? '#60A5FA' : '#BAE6FD'}
                  stopOpacity={0}
                />
                <Stop
                  offset="50%"
                  stopColor={isDarkMode ? '#60A5FA' : '#E0F2FE'}
                  stopOpacity={isDarkMode ? 0.28 : 0.35}
                />
                <Stop
                  offset="100%"
                  stopColor={isDarkMode ? '#60A5FA' : '#BAE6FD'}
                  stopOpacity={0}
                />
              </SvgLinearGradient>

              {/* 18px translucent radial halo for the active dot */}
              <RadialGradient id="dotHalo" cx="50%" cy="50%" r="50%">
                <Stop
                  offset="0%"
                  stopColor={isDarkMode ? '#93C5FD' : '#FFFFFF'}
                  stopOpacity={isDarkMode ? 0.55 : 0.65}
                />
                <Stop
                  offset="55%"
                  stopColor={isDarkMode ? '#60A5FA' : '#BAE6FD'}
                  stopOpacity={isDarkMode ? 0.35 : 0.45}
                />
                <Stop
                  offset="100%"
                  stopColor={isDarkMode ? '#60A5FA' : '#BAE6FD'}
                  stopOpacity={0}
                />
              </RadialGradient>
            </Defs>

            {/* Ambient top & bottom rim glows */}
            <Rect x={0} y={0} width={w} height={h} fill="url(#topGlow)" />
            <Rect x={0} y={0} width={w} height={h} fill="url(#bottomGlow)" />
            <Rect x={0} y={h - 3} width={w} height={3} fill="url(#bottomRim)" />

            {/* Soft outer glow behind curve */}
            <Path
              d={curvePath}
              stroke="url(#curveGlowGrad)"
              strokeWidth={7}
              strokeLinecap="round"
              fill="none"
            />

            {/* Primary 2.5px smooth sine curve */}
            <Path
              d={curvePath}
              stroke="url(#curveStrokeGrad)"
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
            />

            {/* 18px radial halo + 7px center dot at active curve point */}
            <Circle cx={dotX} cy={dotY} r={9} fill="url(#dotHalo)" />
            <Circle
              cx={dotX}
              cy={dotY}
              r={3.5}
              fill={isDarkMode ? '#E0F2FE' : '#FFFFFF'}
            />
          </Svg>

          {/* Lower-anchored text block matching Total Focus Time alignment */}
          <View style={styles.textStack}>
            <Text
              style={[
                styles.percentage,
                { color: '#FFFFFF' },
              ]}
            >
              {clampedScore}%
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: isDarkMode ? '#94A3B8' : 'rgba(224, 242, 254, 0.85)' },
              ]}
            >
              {label}
            </Text>
          </View>
        </>
      )}
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
    backgroundColor: '#060B19',
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  cardLight: {
    backgroundColor: '#2563EB',
    borderColor: 'rgba(147, 197, 253, 0.45)',
  },
  textStack: {
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  percentage: {
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
