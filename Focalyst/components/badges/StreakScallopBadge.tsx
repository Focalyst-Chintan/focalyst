import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import type { BadgeSize } from './HexLevelBadge';

const SIZE_PX: Record<BadgeSize, number> = {
  sm: 56,
  md: 76,
  lg: 98,
  xl: 124,
};

/**
 * Generates a soft, wavy 16-scallop rosette circular path centered at (50, 50).
 */
function buildScallopPath(lobes = 16, innerR = 42.5, outerR = 47.5): string {
  const parts: string[] = [];
  const step = (Math.PI * 2) / lobes;

  for (let i = 0; i < lobes; i++) {
    const a0 = i * step - Math.PI / 2;
    const aMid = a0 + step / 2;
    const a1 = (i + 1) * step - Math.PI / 2;

    const x0 = 50 + innerR * Math.cos(a0);
    const y0 = 50 + innerR * Math.sin(a0);
    const cx = 50 + outerR * Math.cos(aMid);
    const cy = 50 + outerR * Math.sin(aMid);
    const x1 = 50 + innerR * Math.cos(a1);
    const y1 = 50 + innerR * Math.sin(a1);

    if (i === 0) {
      parts.push(`M ${x0.toFixed(2)} ${y0.toFixed(2)}`);
    }
    parts.push(`Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

const ROSETTE_PATH = buildScallopPath(16, 42.5, 47.6);

// Asymmetric, sharp-pointed flame tongues rising from the bottom & bottom-right
const OUTER_RED_FLAME =
  'M 2 100 L 2 84 C 14 82, 24 76, 30 66 C 31 74, 34 79, 38 82 C 41 77, 43 74, 45 70 C 46 76, 49 79, 53 81 C 61 73, 66 61, 72 47 C 75 58, 79 65, 83 70 C 87 67, 92 64, 98 62 L 98 100 Z';

const INNER_ORANGE_FLAME =
  'M 18 100 C 26 90, 34 83, 38 74 C 40 80, 43 84, 47 86 C 55 79, 62 69, 68 58 C 71 67, 75 73, 79 77 C 84 75, 89 74, 94 74 L 94 100 Z';

const BASE_AMBER_FLAME =
  'M 28 100 C 34 94, 39 90, 42 85 C 45 89, 48 91, 51 92 C 56 87, 60 82, 64 76 C 67 82, 71 86, 75 88 C 79 87, 84 87, 88 88 L 88 100 Z';

export function StreakScallopBadge({
  days,
  locked = false,
  size = 'md',
  isDarkMode = true,
}: {
  days: number;
  locked?: boolean;
  size?: BadgeSize;
  isDarkMode?: boolean;
}) {
  const px = SIZE_PX[size];
  const fontSize = Math.round(px * (days >= 100 ? 0.29 : days >= 10 ? 0.35 : 0.41));
  const clipId = `streak-rosette-clip-${days}-${size}-${locked ? 'l' : 'u'}`;
  const bgGradId = `streak-rosette-bg-${days}-${size}`;

  if (locked) {
    const rosetteColor = isDarkMode ? '#222A41' : '#E2E8F0';
    const strokeColor = isDarkMode ? '#2E3856' : '#CBD5E1';
    const flameColor = isDarkMode ? '#2E3856' : '#CBD5E1';
    const textColor = isDarkMode ? '#6B7591' : '#94A3B8';

    return (
      <View style={{ width: px, height: px }}>
        <Svg width={px} height={px} viewBox="0 0 100 100">
          <Defs>
            <ClipPath id={clipId}>
              <Path d={ROSETTE_PATH} />
            </ClipPath>
          </Defs>
          <Path
            d={ROSETTE_PATH}
            fill={rosetteColor}
            stroke={strokeColor}
            strokeOpacity={0.45}
            strokeWidth={1.2}
          />
          <G clipPath={`url(#${clipId})`}>
            <Path d={OUTER_RED_FLAME} fill={flameColor} />
          </G>
        </Svg>
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.centerOverlay,
            { paddingBottom: px * 0.14 },
          ]}
          pointerEvents="none"
        >
          <Text
            style={[
              styles.numberText,
              { fontSize, color: textColor, lineHeight: fontSize * 1.05 },
            ]}
          >
            {days}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: px, height: px }}>
      <Svg width={px} height={px} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={ROSETTE_PATH} />
          </ClipPath>
          <LinearGradient id={bgGradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FDE047" />
            <Stop offset="100%" stopColor="#FACC15" />
          </LinearGradient>
        </Defs>

        {/* Soft scalloped bright yellow background */}
        <Path d={ROSETTE_PATH} fill={`url(#${bgGradId})`} />

        {/* Sharp-tipped organic flames clipped cleanly inside the scalloped rosette */}
        <G clipPath={`url(#${clipId})`}>
          <Path d={OUTER_RED_FLAME} fill="#EF4444" />
          <Path d={INNER_ORANGE_FLAME} fill="#F97316" />
          <Path d={BASE_AMBER_FLAME} fill="#FB923C" />
        </G>
      </Svg>

      {/* Large bold white streak number in the open upper-middle yellow area */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.centerOverlay,
          { paddingBottom: px * 0.14 },
        ]}
        pointerEvents="none"
      >
        <Text
          style={[
            styles.numberText,
            {
              fontSize,
              color: '#FFFFFF',
              lineHeight: fontSize * 1.05,
              textShadowColor: 'rgba(180, 83, 9, 0.35)',
              textShadowOffset: { width: 0, height: 1.5 },
              textShadowRadius: 2,
            },
          ]}
        >
          {days}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
