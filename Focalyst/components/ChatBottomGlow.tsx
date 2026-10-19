import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

type Props = { isDark: boolean; height?: `${number}%` | number };

const THEMES = {
  dark: {
    colors: [
      'rgba(11,16,32,0)',      // matches sheet bg, fully transparent at top
      'rgba(12,26,64,0.45)',
      'rgba(20,52,130,0.78)',
      'rgba(38,96,214,0.92)',
      'rgba(96,150,255,1)',    // bright blue rim at the very bottom
    ],
    locations: [0, 0.35, 0.65, 0.88, 1],
    core: '#6FA0FF',
    coreOpacity: 0.55,
  },
  light: {
    colors: [
      'rgba(255,255,255,0)',
      'rgba(238,244,255,0.65)',
      'rgba(206,224,255,0.88)',
      'rgba(170,200,255,0.96)',
      'rgba(140,182,255,1)',
    ],
    locations: [0, 0.35, 0.65, 0.88, 1],
    core: '#3D6FE0',
    coreOpacity: 0.22,
  },
} as const;

export default function ChatBottomGlow({ isDark, height = '58%' }: Props) {
  const t = isDark ? THEMES.dark : THEMES.light;
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]}>
      <LinearGradient
        colors={t.colors as any}
        locations={t.locations as any}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Defs>
          <RadialGradient
            id="glowCore"
            cx="50%"
            cy="100%"
            rx="70%"
            ry="75%"
            fx="50%"
            fy="100%"
            gradientUnits="objectBoundingBox"
          >
            <Stop offset="0" stopColor={t.core} stopOpacity={t.coreOpacity} />
            <Stop offset="0.6" stopColor={t.core} stopOpacity={t.coreOpacity * 0.35} />
            <Stop offset="1" stopColor={t.core} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#glowCore)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
