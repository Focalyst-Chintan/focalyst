/**
 * Central Brand and Theme Tokens
 * Blue Atmospheric Palette (Dark & Light Modes)
 */

export const BrandPalette = {
  deepNavy: '#03195b',
  royalBlue: '#0b2cb1',
  electricCobalt: '#1951fc',
  brightAzure: '#3781fc',
  icySkyBlue: '#cbe9fd',
} as const;

export const AtmosphericGradientStops = {
  dark: {
    // 0%: Deep Royal/Navy glow (#092388 = soft blend of #0b2cb1 over #03195b)
    // 20%: #071642
    // 40%: #06080f (near-black, stops blue bleed at ~40%)
    // 100%: #05070c (solid deep near-black)
    colors: ['#092388', '#071642', '#06080f', '#05070c'],
    locations: [0, 0.20, 0.40, 1.0],
  },
  light: {
    // 0%: #1951fc (rich azure top)
    // 16%: #3781fc (bright azure behind FOCALYST and greeting)
    // 30%: #93C5FD (smooth airy sky transition)
    // 44%: #EEF4FB
    // 100%: #F6F8FC (clean off-white canvas for the cards below)
    colors: ['#1951fc', '#3781fc', '#93C5FD', '#EEF4FB', '#F6F8FC'],
    locations: [0, 0.16, 0.30, 0.44, 1.0],
  },
} as const;

export const DarkThemeTokens = {
  bg: '#05070c',
  cardBg: '#111521',
  cardBgTranslucent: 'rgba(17, 21, 33, 0.85)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E98AD',
  textMuted: '#64748b',
  ctaBg: '#1951fc',
  ctaText: '#FFFFFF',
  pillContainer: 'rgba(255, 255, 255, 0.07)',
  pillActive: 'rgba(255, 255, 255, 0.14)',
  pillActiveText: '#FFFFFF',
  pillInactiveText: '#8E98AD',
  tabBarCapsule: 'rgba(17, 21, 33, 0.92)',
  tabBarBorder: 'rgba(255, 255, 255, 0.1)',
  tabBarActivePill: '#EBF3FF',
  tabBarActiveIcon: '#03195b',
  tabBarInactiveIcon: '#8E98AD',
  tabBarButtonBg: '#111521',
  tabBarButtonBorder: 'rgba(255, 255, 255, 0.1)',
  chartFocus: '#1951fc',
  chartBreak: '#3781fc',
} as const;

export const LightThemeTokens = {
  bg: '#f6f8fc',
  cardBg: '#FFFFFF',
  cardBgTranslucent: 'rgba(255, 255, 255, 0.78)',
  cardBorder: 'rgba(15, 23, 42, 0.08)',
  textPrimary: '#0A1530',
  textSecondary: '#52607A',
  textMuted: '#8E98AD',
  ctaBg: '#2563EB',
  ctaText: '#FFFFFF',
  pillContainer: 'rgba(10, 21, 48, 0.08)',
  pillActivePrimary: '#03195b',
  pillActiveSecondary: '#5C7399',
  pillActiveText: '#FFFFFF',
  pillInactiveText: '#52607A',
  tabBarCapsule: 'rgba(218, 229, 244, 0.85)',
  tabBarBorder: 'rgba(15, 23, 42, 0.08)',
  tabBarActivePill: '#FFFFFF',
  tabBarActiveIcon: '#03195b',
  tabBarInactiveIcon: '#1E293B',
  tabBarButtonBg: '#1951fc',
  tabBarButtonBorder: 'rgba(15, 23, 42, 0.1)',
  chartFocus: '#0b2cb1',
  chartBreak: '#cbe9fd',
} as const;

export function getThemeTokens(isDark: boolean) {
  return isDark ? DarkThemeTokens : LightThemeTokens;
}

export function getCardSurfaceStyle(isDark: boolean) {
  if (isDark) {
    return {
      backgroundColor: '#111521',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    };
  }
  return {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.07)',
    shadowColor: '#0A1530',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  };
}
