import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Path, Circle } from 'react-native-svg';

interface SeamlessRadialTimerDialProps {
  /** Value between 0.0 and 1.0 representing timer progress */
  progress: number;
  /** Diameter in pixels */
  size: number;
  /** Theme flag */
  isDark?: boolean;
  /** Children rendered dead-center (the countdown text) */
  children?: React.ReactNode;
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function createPieWedgePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const clampedEnd = Math.min(startAngle + 359.99, Math.max(startAngle + 0.5, endAngle));
  const start = polarToCartesian(cx, cy, r, clampedEnd);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = clampedEnd - startAngle <= 180 ? '0' : '1';

  return [
    'M', cx, cy,
    'L', end.x, end.y,
    'A', r, r, 0, largeArcFlag, 1, start.x, start.y,
    'Z',
  ].join(' ');
}

export const SeamlessRadialTimerDial: React.FC<SeamlessRadialTimerDialProps> = ({
  progress,
  size,
  isDark = true,
  children,
}) => {
  const safeProgress = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const half = size / 2;
  const sweepAngle = safeProgress * 360;

  return (
    <View style={[styles.dialWrapper, { width: size, height: size }]} pointerEvents="none">
      {safeProgress > 0.001 && (
        <Svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            {/* Radially Feathered Elapsed Sweep Wedge (fades to 0 opacity before outer edge) */}
            {isDark ? (
              <RadialGradient
                id="focalystBlueWedge"
                cx={String(half)}
                cy={String(half)}
                rx={String(half)}
                ry={String(half)}
                fx={String(half)}
                fy={String(half)}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%" stopColor="#1951fc" stopOpacity="0.55" />
                <Stop offset="55%" stopColor="#0b2cb1" stopOpacity="0.35" />
                <Stop offset="85%" stopColor="#03195b" stopOpacity="0.10" />
                <Stop offset="100%" stopColor="#03195b" stopOpacity="0" />
              </RadialGradient>
            ) : (
              <RadialGradient
                id="focalystBlueWedge"
                cx={String(half)}
                cy={String(half)}
                rx={String(half)}
                ry={String(half)}
                fx={String(half)}
                fy={String(half)}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%" stopColor="#3781fc" stopOpacity="0.35" />
                <Stop offset="60%" stopColor="#3781fc" stopOpacity="0.15" />
                <Stop offset="100%" stopColor="#3781fc" stopOpacity="0" />
              </RadialGradient>
            )}
          </Defs>

          {/* Dynamic Clockwise Pie Wedge with 0% opacity feathered outer edge */}
          {safeProgress >= 0.999 ? (
            <Circle cx={half} cy={half} r={half} fill="url(#focalystBlueWedge)" />
          ) : (
            <Path d={createPieWedgePath(half, half, half, 0, sweepAngle)} fill="url(#focalystBlueWedge)" />
          )}
        </Svg>
      )}

      {/* Centered Countdown Text Overlay */}
      <View style={styles.centerContent} pointerEvents="none">
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    left: -140,
    right: -140,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
