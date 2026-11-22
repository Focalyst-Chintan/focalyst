import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

const DEFAULT_BASE_COLOR = '#2563EB';

function parseRgbChannels(colorStr?: string | null): [number, number, number] {
  if (!colorStr || typeof colorStr !== 'string') {
    return [37, 99, 235]; // #2563EB fallback
  }
  const trimmed = colorStr.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return [
      parseInt(trimmed.slice(1, 3), 16),
      parseInt(trimmed.slice(3, 5), 16),
      parseInt(trimmed.slice(5, 7), 16),
    ];
  }

  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return [
      parseInt(`${r}${r}`, 16),
      parseInt(`${g}${g}`, 16),
      parseInt(`${b}${b}`, 16),
    ];
  }

  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (rgbMatch) {
    return [
      Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))),
      Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))),
      Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))),
    ];
  }

  return [37, 99, 235]; // #2563EB fallback
}

export function colorToRgba(colorStr: string | null | undefined, alpha: number): string {
  const [r, g, b] = parseRgbChannels(colorStr);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Alias for callers using hexToRgba
export const hexToRgba = colorToRgba;

export function mixHex(colorStr: string | null | undefined, targetHex: string, weight: number): string {
  const [r1, g1, b1] = parseRgbChannels(colorStr);
  const [r2, g2, b2] = parseRgbChannels(targetHex);
  const w = Math.max(0, Math.min(1, weight));
  const mr = Math.round(r1 * (1 - w) + r2 * w);
  const mg = Math.round(g1 * (1 - w) + g2 * w);
  const mb = Math.round(b1 * (1 - w) + b2 * w);
  return `#${mr.toString(16).padStart(2, '0')}${mg.toString(16).padStart(2, '0')}${mb.toString(16).padStart(2, '0')}`;
}

function mixRgbWithWhite(colorStr: string | null | undefined, weightWhite: number): string {
  return mixHex(colorStr, '#FFFFFF', weightWhite);
}

export function getPerimeterCardTheme(baseColorStr: string | null | undefined, isDarkMode: boolean) {
  const pureColor = baseColorStr || DEFAULT_BASE_COLOR;

  return {
    baseColor: pureColor,
    backgroundColor: isDarkMode ? '#070910' : pureColor,
    borderColor: isDarkMode
      ? colorToRgba(pureColor, 0.45)
      : colorToRgba(mixHex(pureColor, '#FFFFFF', 0.55), 0.50),
  };
}

interface PerimeterGlowBackgroundProps {
  baseColor?: string | null;
  isDarkMode: boolean;
}

export function PerimeterGlowBackground({
  baseColor,
  isDarkMode,
}: PerimeterGlowBackgroundProps) {
  const pureColor = baseColor || DEFAULT_BASE_COLOR;
  const shineColor = mixRgbWithWhite(pureColor, 0.42);

  if (isDarkMode) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Top Edge Glow (tightened toward rim) */}
        <LinearGradient
          colors={[
            colorToRgba(pureColor, 0.52),
            colorToRgba(pureColor, 0.22),
            'rgba(7, 9, 16, 0)',
          ]}
          locations={[0, 0.14, 0.32]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Bottom Edge Glow (tightened toward rim) */}
        <LinearGradient
          colors={[
            colorToRgba(pureColor, 0.65),
            colorToRgba(pureColor, 0.28),
            'rgba(7, 9, 16, 0)',
          ]}
          locations={[0, 0.16, 0.36]}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Left Edge Glow (tightened toward rim) */}
        <LinearGradient
          colors={[
            colorToRgba(pureColor, 0.42),
            colorToRgba(pureColor, 0.16),
            'rgba(7, 9, 16, 0)',
          ]}
          locations={[0, 0.13, 0.28]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Right Edge Glow (tightened toward rim) */}
        <LinearGradient
          colors={[
            colorToRgba(pureColor, 0.42),
            colorToRgba(pureColor, 0.16),
            'rgba(7, 9, 16, 0)',
          ]}
          locations={[0, 0.13, 0.28]}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Concentrated Bottom-Center Luminous Bloom (seamless radial fade, no side seams) */}
        <Svg
          width="100%"
          height={52}
          style={styles.bottomBloom}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="specularBottomBloom" cx="50%" cy="100%" rx="44%" ry="95%">
              <Stop offset="0%" stopColor={shineColor} stopOpacity="0.52" />
              <Stop offset="40%" stopColor={pureColor} stopOpacity="0.24" />
              <Stop offset="100%" stopColor={pureColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="52" fill="url(#specularBottomBloom)" />
        </Svg>

        {/* Crisp Bottom Glass Light-Catch Line */}
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0)',
            colorToRgba(shineColor, 0.95),
            'rgba(255, 255, 255, 0)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.bottomSpecularLine}
        />

        {/* Subtle Top-Edge Glass Reflection */}
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0)',
            colorToRgba(shineColor, 0.55),
            'rgba(255, 255, 255, 0)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.topSpecularLine}
        />
      </View>
    );
  }

  const deepShade = mixHex(pureColor, '#0F172A', 0.34);
  const lightRimHighlight = mixHex(pureColor, '#FFFFFF', 0.65);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Dynamic Saturated Jewel-Tone Gradient */}
      <LinearGradient
        colors={[deepShade, pureColor, pureColor]}
        locations={[0, 0.52, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Full-bleed Bottom-Center Luminous Rim Glow */}
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="lightHabitBottomGlow" cx="50%" cy="104%" rx="72%" ry="52%">
            <Stop offset="0%" stopColor={shineColor} stopOpacity="0.62" />
            <Stop offset="42%" stopColor={shineColor} stopOpacity="0.28" />
            <Stop offset="100%" stopColor={pureColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#lightHabitBottomGlow)" />
      </Svg>

      {/* Crisp Bottom Specular Light-Catch Line */}
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0)',
          colorToRgba(lightRimHighlight, 0.9),
          'rgba(255, 255, 255, 0)',
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.bottomSpecularLine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBloom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 52,
  },
  bottomSpecularLine: {
    position: 'absolute',
    bottom: 0,
    left: '18%',
    right: '18%',
    height: 1.5,
  },
  topSpecularLine: {
    position: 'absolute',
    top: 0,
    left: '14%',
    right: '14%',
    height: 1,
  },
  lightBottomAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
  },
});
