import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { CountdownWidgetProps, WidgetEnv } from './types';

const CountdownWidget = (rawProps: CountdownWidgetProps, env?: WidgetEnv) => {
  'widget';
  // Gallery and placeholder entries arrive without props: show a realistic sample instead.
  const props = {
    eventTitle: 'Audit',
    targetDateLabel: '01/12/2026',
    daysLeft: 35,
    hoursLeft: 5,
    minutesLeft: 58,
    ...(rawProps as Partial<CountdownWidgetProps>),
  };
  const preset = props.preset ?? 'emerald';
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
      return { text: '#FFFFFF', secondaryText: rgba(WHITE, 0.6), pill: rgba(WHITE, 0.14), accent: '#FFFFFF' };
    }
    if (preset === 'monochrome') {
      return isDark
        ? { text: '#FFFFFF', secondaryText: rgba(WHITE, 0.6), pill: rgba(WHITE, 0.1), accent: '#FFFFFF' }
        : { text: '#0B0B0F', secondaryText: rgba(INK, 0.55), pill: rgba(INK, 0.06), accent: '#0B0B0F' };
    }
    if (preset === 'white') {
      return { text: '#090A0F', secondaryText: '#475569', pill: rgba('9, 10, 15', 0.06), accent: '#0F172A' };
    }
    const themes: Record<string, { secondaryText: string; accent: string }> = {
      ember: { secondaryText: '#FDBA74', accent: '#FF6B2B' },
      cobalt: { secondaryText: '#93C5FD', accent: '#60A5FA' },
      emerald: { secondaryText: '#6EE7B7', accent: '#34D399' },
      violet: { secondaryText: '#C4B5FD', accent: '#A78BFA' },
      crimson: { secondaryText: '#FDA4AF', accent: '#FB7185' },
      amber: { secondaryText: '#FDE68A', accent: '#FBBF24' },
    };
    const theme = themes[preset] ?? themes.emerald;
    return { text: '#FFFFFF', secondaryText: theme.secondaryText, pill: rgba(WHITE, 0.1), accent: theme.accent };
  };

  const p = makePalette();
  const accentable: any[] = isAccented ? [{ $type: 'widgetAccentable', accentable: true }] : [];
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const titleText = (props.eventTitle && props.eventTitle.trim().length > 0
    ? props.eventTitle
    : 'Countdown'
  ).toUpperCase();

  const units = [
    { label: 'DAYS', value: pad(props.daysLeft ?? 0) },
    { label: 'HRS', value: pad(props.hoursLeft ?? 0) },
    { label: 'MINS', value: pad(props.minutesLeft ?? 0) },
  ];

  return (
    <VStack modifiers={[padding({ all: 10 })]}>
      <VStack modifiers={[padding({ horizontal: 8, vertical: 5 }), background(p.pill), cornerRadius(8)]}>
        <HStack>
          <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(p.secondaryText)]}>
            {titleText}
          </Text>
          <Spacer />
        </HStack>
        <HStack>
          <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(p.text)]}>
            {`${props.daysLeft ?? 0} days left`}
          </Text>
          <Spacer />
        </HStack>
      </VStack>

      <Spacer />

      <HStack>
        {units.map((u) => (
          <VStack
            key={u.label}
            modifiers={[
              frame({ width: 38, height: 34 }),
              background(p.pill),
              cornerRadius(7),
            ]}
          >
            <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(p.text), ...accentable]}>
              {u.value}
            </Text>
            <Text modifiers={[font({ size: 7, weight: 'bold' }), foregroundStyle(p.secondaryText)]}>
              {u.label}
            </Text>
          </VStack>
        ))}
      </HStack>

      <Spacer />

      <HStack>
        <Spacer />
        <HStack modifiers={[padding({ horizontal: 7, vertical: 2.5 }), background(p.pill), cornerRadius(6)]}>
          <Text modifiers={[font({ size: 9, weight: 'bold' }), foregroundStyle(p.accent), ...accentable]}>
            {props.targetDateLabel}
          </Text>
        </HStack>
      </HStack>
    </VStack>
  );
};

export default safeCreateWidget('CountdownWidget', CountdownWidget, {
  preset: 'emerald',
  systemScheme: 'dark',
  eventTitle: 'Audit',
  targetDateLabel: '01/12/2026',
  daysLeft: 35,
  hoursLeft: 5,
  minutesLeft: 58,
});
