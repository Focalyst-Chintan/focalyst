import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { CountdownWidgetProps, WidgetEnv } from './types';

const CountdownWidget = (props: CountdownWidgetProps, env?: WidgetEnv) => {
  'widget';
  const scheme = env?.colorScheme ?? props.systemScheme ?? 'dark';
  const isDark = scheme === 'dark';
  const preset = props.preset ?? 'emerald';

  const getPalette = () => {
    if (preset === 'white' || (preset === 'monochrome' && !isDark)) {
      return { bg: '#F8FAFC', glowBand: '#E2E8F0', card: '#FFFFFF', text: '#090A0F', muted: '#475569', accent: '#0F172A' };
    }
    if (preset === 'monochrome') {
      return { bg: '#090A0F', glowBand: '#181B24', card: '#141720', text: '#FFFFFF', muted: '#94A3B8', accent: '#FFFFFF' };
    }
    const map: Record<string, any> = {
      ember: { bg: '#160804', glowBand: '#5E1E0C', card: '#2B1007', text: '#FFFFFF', muted: '#FDBA74', accent: '#FF6B2B' },
      cobalt: { bg: '#060D1F', glowBand: '#153480', card: '#0F204A', text: '#FFFFFF', muted: '#93C5FD', accent: '#60A5FA' },
      emerald: { bg: '#05140F', glowBand: '#0F4230', card: '#0B2B20', text: '#FFFFFF', muted: '#6EE7B7', accent: '#34D399' },
      violet: { bg: '#0C061C', glowBand: '#37197A', card: '#1A0D3B', text: '#FFFFFF', muted: '#C4B5FD', accent: '#A78BFA' },
      crimson: { bg: '#190509', glowBand: '#631321', card: '#300A12', text: '#FFFFFF', muted: '#FDA4AF', accent: '#FB7185' },
      amber: { bg: '#170F04', glowBand: '#59370B', card: '#2E1E08', text: '#FFFFFF', muted: '#FDE68A', accent: '#FBBF24' },
    };
    return map[preset] ?? map.emerald;
  };

  // Tinted and Clear home screens render widgets in the accented mode: fixed colours and opaque
  // fills turn into solid tiles there, so use hierarchical styles and alpha-only fills instead.
  const tinted = env?.widgetRenderingMode === 'accented' || env?.widgetRenderingMode === 'vibrant';
  const accent = tinted ? [{ $type: 'widgetAccentable', accentable: true }] : [];
  const primary = { type: 'hierarchical', style: 'primary' };
  const secondary = { type: 'hierarchical', style: 'secondary' };
  const p = tinted
    ? { bg: '', glowBand: '#1FFFFFFF', card: '#1FFFFFFF', text: primary, muted: secondary, accent: primary }
    : getPalette();
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
    <VStack modifiers={[padding({ all: 10 }), ...(tinted ? [] : [background(p.bg)])]}>
      <VStack modifiers={[padding({ horizontal: 8, vertical: 5 }), background(p.glowBand), cornerRadius(8)]}>
        <HStack>
          <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(p.muted)]}>
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
              background(p.card),
              cornerRadius(7),
            ]}
          >
            <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(p.text), ...accent]}>
              {u.value}
            </Text>
            <Text modifiers={[font({ size: 7, weight: 'bold' }), foregroundStyle(p.muted)]}>
              {u.label}
            </Text>
          </VStack>
        ))}
      </HStack>

      <Spacer />

      <HStack>
        <Spacer />
        <HStack modifiers={[padding({ horizontal: 7, vertical: 2.5 }), background(p.card), cornerRadius(6)]}>
          <Text modifiers={[font({ size: 9, weight: 'bold' }), foregroundStyle(p.accent)]}>
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
