import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type { WrappedPosterTheme } from './wrappedThemes';

interface WrappedGradientCanvasProps {
  theme: WrappedPosterTheme;
  idPrefix: string;
}

export const WrappedGradientCanvas: React.FC<WrappedGradientCanvasProps> = ({
  theme,
  idPrefix,
}) => {
  const grainId = `wrapped-grain-${idPrefix}`;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.baseBg }]} pointerEvents="none">
      {/* Subtle directional shadow anchor */}
      <LinearGradient
        colors={theme.washColors}
        locations={theme.washLocations}
        start={{ x: 0.9, y: 0.05 }}
        end={{ x: 0.1, y: 0.95 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 3 overlapping large elliptical SVG radial sweeps + tactile film grain */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          {theme.blooms.map((bloom, idx) => (
            <RadialGradient
              key={`rg-${idx}`}
              id={`wrapped-bloom-${idPrefix}-${idx}`}
              cx={bloom.cx}
              cy={bloom.cy}
              rx={bloom.rx}
              ry={bloom.ry}
            >
              {bloom.stops.map((s, sIdx) => (
                <Stop
                  key={`s-${idx}-${sIdx}`}
                  offset={s.offset}
                  stopColor={s.color}
                  stopOpacity={s.opacity}
                />
              ))}
            </RadialGradient>
          ))}

          <Pattern id={grainId} width="6" height="6" patternUnits="userSpaceOnUse">
            <Circle cx="1.1" cy="1.4" r="0.45" fill="#FFFFFF" fillOpacity="0.036" />
            <Circle cx="4.4" cy="4.2" r="0.35" fill="#FFFFFF" fillOpacity="0.025" />
            <Circle cx="2.9" cy="5.3" r="0.30" fill="#000000" fillOpacity="0.04" />
          </Pattern>
        </Defs>

        {theme.blooms.map((bloom, idx) => (
          <Ellipse
            key={`el-${idx}`}
            cx={bloom.cx}
            cy={bloom.cy}
            rx={bloom.rx}
            ry={bloom.ry}
            fill={`url(#wrapped-bloom-${idPrefix}-${idx})`}
          />
        ))}

        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${grainId})`} />
      </Svg>
    </View>
  );
};
