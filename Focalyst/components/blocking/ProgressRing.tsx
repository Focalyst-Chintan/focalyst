import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useBlockingTheme, useReduceMotion } from '../../constants/blockingTheme';

export const RING_SIZES = {
  session: { size: 260, stroke: 14 },
  intro: { size: 152, stroke: 10 },
  summary: { size: 96, stroke: 8 },
} as const;

type Rgba = [number, number, number, number];

function parseColor(color: string): Rgba {
  const rgba = color.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const [r, g, b, a = '1'] = rgba[1].split(',').map((p) => p.trim());
    return [Number(r), Number(g), Number(b), Number(a)];
  }
  const hex = color.replace('#', '');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 1];
}

const mix = (a: Rgba, b: Rgba, t: number) =>
  `rgba(${a.map((v, i) => (i < 3 ? Math.round(v + (b[i] - v) * t) : +(v + (b[i] - v) * t).toFixed(3))).join(',')})`;

const point = (cx: number, cy: number, r: number, angle: number) => {
  // 0 rad = 12 o'clock, clockwise.
  return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];
};

// SVG has no sweep gradient, so the arc is drawn as short segments with interpolated colors.
const SEGMENTS_PER_TURN = 90;

type Props = {
  size: number;
  stroke: number;
  /** 0 to 1. */
  progress: number;
  variant?: 'accent' | 'success';
  /** Draw from 0 to `progress` on first appear (600 ms). */
  animateIn?: boolean;
  dimmed?: boolean;
  children?: React.ReactNode;
};

/** Round caps, starts at 12 o'clock, runs clockwise. Shared by session, intro and summary. */
export function ProgressRing({ size, stroke, progress, variant = 'accent', animateIn, dimmed, children }: Props) {
  const { c } = useBlockingTheme();
  const reduceMotion = useReduceMotion();
  const target = Math.min(1, Math.max(0, progress));
  const [shown, setShown] = useState(animateIn && !reduceMotion ? 0 : target);
  const intro = useRef(animateIn && !reduceMotion);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!intro.current) {
      setShown(target);
      return;
    }
    intro.current = false;
    const id = anim.addListener(({ value }) => setShown(value));
    Animated.timing(anim, {
      toValue: target,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => anim.removeListener(id));
    return () => anim.removeListener(id);
    // Only the very first target animates; later ticks jump so the ring advances linearly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const [startColor, endColor] =
    variant === 'success'
      ? [parseColor(c.success), (([r, g, b]) => [r, g, b, 0.7] as Rgba)(parseColor(c.success))]
      : [parseColor(c.accent), parseColor(c.accentSoft)];

  const r = (size - stroke) / 2;
  const cx = size / 2;
  const sweep = shown * Math.PI * 2;
  const count = Math.max(1, Math.ceil(shown * SEGMENTS_PER_TURN));
  const step = sweep / count;

  const segments: React.ReactNode[] = [];
  if (shown > 0.001) {
    for (let i = 0; i < count; i++) {
      const a0 = i * step;
      // Overlap slightly so anti-aliasing doesn't leave seams between segments.
      const a1 = Math.min(sweep, (i + 1) * step + 0.01);
      const [x0, y0] = point(cx, cx, r, a0);
      const [x1, y1] = point(cx, cx, r, a1);
      segments.push(
        <Path
          key={i}
          d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`}
          stroke={mix(startColor, endColor, count === 1 ? 0 : i / (count - 1))}
          strokeWidth={stroke}
          fill="none"
        />
      );
    }
  }
  const [sx, sy] = point(cx, cx, r, 0);
  const [ex, ey] = point(cx, cx, r, sweep);

  return (
    <View style={{ width: size, height: size, opacity: dimmed ? 0.4 : 1 }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cx} r={r} stroke={c.border} strokeWidth={stroke} fill="none" />
        {segments}
        {shown > 0.001 && (
          <>
            <Circle cx={sx} cy={sy} r={stroke / 2} fill={mix(startColor, startColor, 0)} />
            <Circle cx={ex} cy={ey} r={stroke / 2} fill={mix(startColor, endColor, 1)} />
          </>
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
