import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Polygon,
  Stop,
} from 'react-native-svg';
import { LEVEL_BADGE_PALETTES } from '../../src/utils/badgeMilestones';

export type BadgeSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<BadgeSize, number> = {
  sm: 56,
  md: 76,
  lg: 98,
  xl: 124,
};

const OUTER_HEX_PATH =
  'M 45.5 7.6 Q 50 5 54.5 7.6 L 83.6 24.4 Q 88.1 27 88.1 32.2 L 88.1 65.8 Q 88.1 71 83.6 73.6 L 54.5 90.4 Q 50 93 45.5 90.4 L 16.4 73.6 Q 11.9 71 11.9 65.8 L 11.9 32.2 Q 11.9 27 16.4 24.4 Z';

const INNER_HEX_PATH =
  'M 46.2 14.8 Q 50 12.6 53.8 14.8 L 77.6 28.5 Q 81.4 30.7 81.4 35.1 L 81.4 62.9 Q 81.4 67.3 77.6 69.5 L 53.8 83.2 Q 50 85.4 46.2 83.2 L 22.4 69.5 Q 18.6 67.3 18.6 62.9 L 18.6 35.1 Q 18.6 30.7 22.4 28.5 Z';

export function HexLevelBadge({
  level,
  locked = false,
  size = 'md',
  isDarkMode = true,
}: {
  level: number;
  locked?: boolean;
  size?: BadgeSize;
  isDarkMode?: boolean;
}) {
  const px = SIZE_PX[size];
  const palette = LEVEL_BADGE_PALETTES[level] || LEVEL_BADGE_PALETTES[1];
  const fontSize = Math.round(px * (level >= 10 ? 0.39 : 0.45));
  const clipId = `hex-clip-${level}-${size}`;
  const faceGradId = `hex-face-${level}-${size}`;
  const sheenGradId = `hex-sheen-${level}-${size}`;

  if (locked) {
    const edgeColor = isDarkMode ? '#1B2236' : '#CBD5E1';
    const baseColor = isDarkMode ? '#2A334D' : '#E2E8F0';
    const rimColor = isDarkMode ? '#384466' : '#CBD5E1';
    const innerColor = isDarkMode ? '#222A41' : '#CBD5E1';
    const textColor = isDarkMode ? '#4B5563' : '#94A3B8';

    return (
      <View style={{ width: px, height: px }}>
        <Svg width={px} height={px} viewBox="0 0 100 100">
          <G transform="translate(0, 4.5)">
            <Path d={OUTER_HEX_PATH} fill={edgeColor} />
          </G>
          <Path
            d={OUTER_HEX_PATH}
            fill={baseColor}
            stroke={rimColor}
            strokeWidth={2}
          />
          <Path
            d={INNER_HEX_PATH}
            fill={innerColor}
            fillOpacity={1}
            stroke={edgeColor}
            strokeOpacity={0.45}
            strokeWidth={1.5}
          />
        </Svg>
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.centerOverlay,
            { paddingBottom: px * 0.03 },
          ]}
          pointerEvents="none"
        >
          <Text
            style={[
              styles.numberText,
              { fontSize, color: textColor, lineHeight: fontSize * 1.05 },
            ]}
          >
            {level}
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
            <Path d={INNER_HEX_PATH} />
          </ClipPath>
          <LinearGradient id={faceGradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={palette.rimHighlight} />
            <Stop offset="55%" stopColor={palette.baseFill} />
            <Stop offset="100%" stopColor={palette.innerBevel} />
          </LinearGradient>
          <LinearGradient id={sheenGradId} x1="0" y1="0" x2="0.8" y2="0.8">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.45} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.05} />
          </LinearGradient>
        </Defs>

        {/* Bottom 3D extrusion edge */}
        <G transform="translate(0, 5)">
          <Path d={OUTER_HEX_PATH} fill={palette.bottomEdge} />
        </G>

        {/* Outer beveled rim & base */}
        <Path
          d={OUTER_HEX_PATH}
          fill={`url(#${faceGradId})`}
          stroke={palette.rimHighlight}
          strokeWidth={2}
        />

        {/* Inner recessed hexagon */}
        <Path
          d={INNER_HEX_PATH}
          fill={palette.baseFill}
          stroke={palette.bottomEdge}
          strokeOpacity={0.32}
          strokeWidth={1.5}
        />

        {/* Top-left glossy diagonal sheen */}
        <G clipPath={`url(#${clipId})`}>
          <Polygon points="8,8 82,8 14,78 8,78" fill={`url(#${sheenGradId})`} />
          <Polygon points="14,10 56,10 14,52" fill="#FFFFFF" fillOpacity={0.18} />
        </G>
      </Svg>

      {/* Dead-centered level number */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.centerOverlay,
          { paddingBottom: px * 0.03 },
        ]}
        pointerEvents="none"
      >
        <Text
          style={[
            styles.numberText,
            {
              fontSize,
              color: palette.numberFill,
              lineHeight: fontSize * 1.05,
              textShadowColor: 'rgba(255,255,255,0.28)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 1,
            },
          ]}
        >
          {level}
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
