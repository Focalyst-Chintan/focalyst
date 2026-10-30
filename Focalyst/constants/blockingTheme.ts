import { useEffect, useState } from 'react';
import { AccessibilityInfo, DeviceEventEmitter, Platform, type TextStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Distraction blocking design tokens (FOCALYST_BLOCKING_DESIGN.md section 1).

export type BlockingTokens = {
  bg: string;
  surface: string;
  surface2: string;
  iconCircle: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentSoft: string;
  accentFill: string;
  onAccent: string;
  accentTint: string;
  selectedFill: string;
  onSelected: string;
  success: string;
  danger: string;
  dangerTint: string;
  scrim: string;
  glass: string;
  glassBorder: string;
  snackbar: string;
};

export const lightTokens: BlockingTokens = {
  bg: '#F8F9FF',
  surface: '#FFFFFF',
  surface2: '#EFF3FF',
  iconCircle: '#E6EEFF',
  border: '#E3E8F2',
  textPrimary: '#121C2A',
  textSecondary: '#42474D',
  textTertiary: '#73777E',
  accent: '#315472',
  accentSoft: '#5B86AD',
  accentFill: '#315472',
  onAccent: '#FFFFFF',
  accentTint: '#D4E3FF',
  selectedFill: '#315472',
  onSelected: '#FFFFFF',
  success: '#1E7A4C',
  danger: '#BA1A1A',
  dangerTint: '#FFDAD6',
  scrim: 'rgba(18, 28, 42, 0.40)',
  glass: 'rgba(255, 255, 255, 0.82)',
  glassBorder: 'rgba(255, 255, 255, 0.60)',
  snackbar: '#FFFFFF',
};

export const darkTokens: BlockingTokens = {
  bg: '#0F1220',
  surface: '#181C2C',
  surface2: '#0F1220',
  iconCircle: '#262B3D',
  border: '#262B3D',
  textPrimary: '#FFFFFF',
  textSecondary: '#9AA0B4',
  textTertiary: '#7C8297',
  accent: '#EE7742',
  accentSoft: '#F6A06F',
  accentFill: '#D9622B',
  onAccent: '#FFFFFF',
  accentTint: 'rgba(238, 119, 66, 0.14)',
  selectedFill: '#FFFFFF',
  onSelected: '#0F1220',
  success: '#5FD39A',
  danger: '#FF8A7A',
  dangerTint: 'rgba(255, 138, 122, 0.12)',
  scrim: 'rgba(0, 0, 0, 0.60)',
  glass: 'rgba(24, 28, 44, 0.80)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  snackbar: '#262B3D',
};

/** Filled orange CTA used app-wide; deepened from #EE7742 so white labels pass contrast. */
export const ORANGE_FILL = '#D9622B';

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

export const type = {
  setupTitle: { fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.3 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  cardTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  secondary: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  overline: { fontSize: 13, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  statNumber: { fontSize: 28, lineHeight: 32, fontWeight: '700', fontVariant: tabular },
  timer: { fontSize: 64, lineHeight: 68, fontWeight: '700', fontVariant: tabular },
  buttonLabel: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  tabular: { fontVariant: tabular },
} satisfies Record<string, TextStyle>;

export const cardShadow = (isDark: boolean) =>
  isDark
    ? {}
    : {
        shadowColor: '#121C2A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      };

export const floatingShadow = (isDark: boolean) =>
  isDark
    ? {}
    : {
        shadowColor: '#121C2A',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
      };

/**
 * The app's dark mode lives in AsyncStorage ('darkMode') and is broadcast with 'themeChanged',
 * same as the Focus tab. Defaults to dark like the Focus tab does.
 */
export function useAppDarkMode() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem('darkMode')
      .then((val) => {
        if (alive && val !== null) setIsDark(val === 'true');
      })
      .catch(() => {});
    const sub = DeviceEventEmitter.addListener('themeChanged', (val: boolean) => setIsDark(val));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return isDark;
}

function useAccessibilityFlag(
  query: () => Promise<boolean>,
  event: 'reduceMotionChanged' | 'reduceTransparencyChanged'
) {
  const [value, setValue] = useState(false);
  useEffect(() => {
    query().then(setValue).catch(() => {});
    const sub = AccessibilityInfo.addEventListener(event, setValue);
    return () => sub.remove();
  }, [query, event]);
  return value;
}

const queryReduceTransparency = () =>
  Platform.OS === 'ios' ? AccessibilityInfo.isReduceTransparencyEnabled() : Promise.resolve(false);

export const useReduceMotion = () =>
  useAccessibilityFlag(AccessibilityInfo.isReduceMotionEnabled, 'reduceMotionChanged');

export function useBlockingTheme() {
  const isDark = useAppDarkMode();
  const reduceTransparency = useAccessibilityFlag(queryReduceTransparency, 'reduceTransparencyChanged');
  const c = isDark ? darkTokens : lightTokens;
  return {
    isDark,
    c,
    /** Glass fill, or solid surface when Reduce Transparency is on. */
    glass: reduceTransparency ? c.surface : c.glass,
  };
}
