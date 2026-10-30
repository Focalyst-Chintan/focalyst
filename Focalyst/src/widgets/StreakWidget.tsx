import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { StreakWidgetProps, WidgetEnv } from './types';

const StreakWidget = (rawProps: StreakWidgetProps, env?: WidgetEnv) => {
  'widget';
  // Gallery and placeholder entries arrive without props: show a realistic sample instead.
  const props = { habitName: 'Yoga', streakDays: 26, totalDays: 48, goalDays: 30, ...(rawProps as Partial<StreakWidgetProps>) };
  const preset = props.preset ?? 'ember';
  const isDark = (env?.colorScheme ?? props.systemScheme ?? 'dark') === 'dark';
  const mode = env?.widgetRenderingMode;
  const isAccented = mode === 'accented' || mode === 'vibrant';
  const rgba = (rgb: string, alpha: number) => `rgba(${rgb}, ${alpha})`;

  // Clear and Tinted render in the accented mode, which keeps only opacity: every fill there is
  // white at a fixed alpha. Colours are rgba() because natively an 8-digit hex reads as RRGGBBAA.
  // The background itself is the widget's containerBackground (FocalystThemeBackground in Swift).
  const makePalette = () => {
    const WHITE = '255, 255, 255';
    const INK = '11, 11, 15';
    if (isAccented) {
      return { text: '#FFFFFF', secondaryText: rgba(WHITE, 0.6), pill: rgba(WHITE, 0.14), track: rgba(WHITE, 0.18), accent: '#FFFFFF' };
    }
    if (preset === 'monochrome') {
      return isDark
        ? { text: '#FFFFFF', secondaryText: rgba(WHITE, 0.6), pill: rgba(WHITE, 0.1), track: rgba(WHITE, 0.14), accent: '#FFFFFF' }
        : { text: '#0B0B0F', secondaryText: rgba(INK, 0.55), pill: rgba(INK, 0.06), track: rgba(INK, 0.1), accent: '#0B0B0F' };
    }
    if (preset === 'white') {
      return { text: '#090A0F', secondaryText: '#475569', pill: rgba('9, 10, 15', 0.06), track: rgba('9, 10, 15', 0.1), accent: '#0F172A' };
    }
    const themes: Record<string, { secondaryText: string; accent: string }> = {
      ember: { secondaryText: '#FDBA74', accent: '#FF5500' },
      cobalt: { secondaryText: '#93C5FD', accent: '#3B82F6' },
      emerald: { secondaryText: '#6EE7B7', accent: '#10B981' },
      violet: { secondaryText: '#C4B5FD', accent: '#8B5CF6' },
      crimson: { secondaryText: '#FDA4AF', accent: '#F43F5E' },
      amber: { secondaryText: '#FDE68A', accent: '#F59E0B' },
    };
    const theme = themes[preset] ?? themes.ember;
    return { text: '#FFFFFF', secondaryText: theme.secondaryText, pill: rgba(WHITE, 0.1), track: rgba(WHITE, 0.14), accent: theme.accent };
  };

  const p = makePalette();
  const accentable: any[] = isAccented ? [{ $type: 'widgetAccentable', accentable: true }] : [];
  const goal = props.goalDays && props.goalDays > 0 ? props.goalDays : 30;
  const trackWidth = 120;
  const barHeight = 6;
  // A missing streak is 0, so the bar width is never NaN.
  const streakDays = Math.max(0, Math.floor(Number(props.streakDays) || 0));
  const progress = Math.max(0, Math.min(1, streakDays / goal));
  // At least the bar's height, so a small streak still shows as a dot.
  const fillWidth = Math.max(barHeight, Math.round(trackWidth * progress));

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <HStack modifiers={[padding({ horizontal: 8, vertical: 6 }), background(p.pill), cornerRadius(10)]}>
        <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(p.text)]}>
          {`🔥 ${props.habitName}`}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(p.secondaryText)]}>
          {`${Math.max(0, Math.floor(Number(props.totalDays) || 0))}d`}
        </Text>
      </HStack>

      <Spacer />

      <VStack>
        <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(p.secondaryText)]}>
          Streak Days
        </Text>
        <Text modifiers={[font({ size: 34, weight: 'bold' }), foregroundStyle(p.text), ...accentable]}>
          {`${streakDays}`}
        </Text>
      </VStack>

      <Spacer />

      <HStack modifiers={[frame({ width: trackWidth, height: barHeight }), background(p.track), cornerRadius(barHeight / 2)]}>
        <HStack
          modifiers={[frame({ width: fillWidth, height: barHeight }), background(p.accent), cornerRadius(barHeight / 2), ...accentable]}
        >
          {null}
        </HStack>
        <Spacer />
      </HStack>
    </VStack>
  );
};

export default safeCreateWidget('StreakWidget', StreakWidget, {
  preset: 'ember',
  systemScheme: 'dark',
  habitName: 'Yoga',
  streakDays: 26,
  totalDays: 48,
  goalDays: 30,
});
