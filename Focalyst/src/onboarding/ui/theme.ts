import { useColorScheme } from '@/components/useColorScheme';

// Tokens from IOS_ONBOARDING_DESIGN.md section 3.1. Onboarding-only: the facelift
// components (AmbientBackground, glass cards, HeroCard, TrendChart) aren't in the app yet.

export interface OnboardingTheme {
  dark: boolean;
  canvas: string;
  surface: string;
  surfaceBorder: string;
  surfaceStrong: string;
  ink: string;
  ink2: string;
  ink3: string;
  primary: string;
  primaryText: string;
  gradPrimary: [string, string];
  gradLine: [string, string];
  selectedBorder: string;
}

const dark: OnboardingTheme = {
  dark: true,
  canvas: '#060A1A',
  surface: 'rgba(255,255,255,0.06)',
  surfaceBorder: 'rgba(255,255,255,0.10)',
  surfaceStrong: 'rgba(255,255,255,0.10)',
  ink: '#F4F7FF',
  ink2: '#B7C0D8',
  ink3: '#7F8AA8',
  primary: '#1951FC',
  primaryText: '#6FA2FF',
  gradPrimary: ['#1951FC', '#3781FC'],
  gradLine: ['#3781FC', '#CBE9FD'],
  selectedBorder: '#3781FC',
};

const light: OnboardingTheme = {
  dark: false,
  canvas: '#F5F8FF',
  surface: 'rgba(255,255,255,0.75)',
  surfaceBorder: 'rgba(3,25,91,0.08)',
  surfaceStrong: 'rgba(3,25,91,0.06)',
  ink: '#0A1033',
  ink2: '#3D4566',
  ink3: '#5F6787',
  primary: '#1951FC',
  primaryText: '#1951FC',
  gradPrimary: ['#1951FC', '#3781FC'],
  gradLine: ['#1951FC', '#0B2CB1'],
  selectedBorder: '#3781FC',
};

export function useOnboardingTheme(): OnboardingTheme {
  return useColorScheme() === 'dark' ? dark : light;
}

export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// No serif display font is installed, so titles use the app's current (system) font.
export const type = {
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const, letterSpacing: -0.4 },
  subtitle: { fontSize: 16, lineHeight: 24 },
};

export const GUTTER = 20;
