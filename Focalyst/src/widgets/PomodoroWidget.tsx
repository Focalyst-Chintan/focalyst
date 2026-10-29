import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { PomodoroWidgetProps, WidgetEnv } from './types';

const PomodoroWidget = (props: PomodoroWidgetProps, env?: WidgetEnv) => {
  'widget';
  const scheme = env?.colorScheme ?? props.systemScheme ?? 'dark';
  const isDark = scheme === 'dark';
  const preset = props.preset ?? 'cobalt';

  const getPalette = () => {
    if (preset === 'white' || (preset === 'monochrome' && !isDark)) {
      return { bg: '#F8FAFC', topGlow: '#E2E8F0', text: '#090A0F', muted: '#475569', startBg: '#090A0F', startText: '#FFFFFF', endBg: '#DC2626', endText: '#FFFFFF' };
    }
    if (preset === 'monochrome') {
      return isDark
        ? { bg: '#090A0F', topGlow: '#181B24', text: '#FFFFFF', muted: '#94A3B8', startBg: '#FFFFFF', startText: '#090A0F', endBg: '#EF4444', endText: '#FFFFFF' }
        : { bg: '#F8FAFC', topGlow: '#E2E8F0', text: '#090A0F', muted: '#64748B', startBg: '#090A0F', startText: '#FFFFFF', endBg: '#DC2626', endText: '#FFFFFF' };
    }
    const map: Record<string, any> = {
      ember: { bg: '#160804', topGlow: '#6E220D', text: '#FFFFFF', muted: '#FDBA74', startBg: '#FFFFFF', startText: '#090A0F', endBg: '#EF4444', endText: '#FFFFFF' },
      cobalt: { bg: '#060D1F', topGlow: '#1A3F99', text: '#FFFFFF', muted: '#93C5FD', startBg: '#FFFFFF', startText: '#090A0F', endBg: '#EF4444', endText: '#FFFFFF' },
      emerald: { bg: '#05140F', topGlow: '#114F3A', text: '#FFFFFF', muted: '#6EE7B7', startBg: '#FFFFFF', startText: '#090A0F', endBg: '#EF4444', endText: '#FFFFFF' },
      violet: { bg: '#0C061C', topGlow: '#432091', text: '#FFFFFF', muted: '#C4B5FD', startBg: '#FFFFFF', startText: '#090A0F', endBg: '#EF4444', endText: '#FFFFFF' },
      crimson: { bg: '#190509', topGlow: '#751728', text: '#FFFFFF', muted: '#FDA4AF', startBg: '#FFFFFF', startText: '#090A0F', endBg: '#F43F5E', endText: '#FFFFFF' },
      amber: { bg: '#170F04', topGlow: '#6B420D', text: '#FFFFFF', muted: '#FDE68A', startBg: '#FFFFFF', startText: '#090A0F', endBg: '#EF4444', endText: '#FFFFFF' },
    };
    return map[preset] ?? map.cobalt;
  };

  // Tinted and Clear home screens render widgets in the accented mode: fixed colours and opaque
  // fills turn into solid tiles there, so use hierarchical styles and alpha-only fills instead.
  const tinted = env?.widgetRenderingMode === 'accented' || env?.widgetRenderingMode === 'vibrant';
  const accent = tinted ? [{ $type: 'widgetAccentable', accentable: true }] : [];
  const primary = { type: 'hierarchical', style: 'primary' };
  const secondary = { type: 'hierarchical', style: 'secondary' };
  const p = tinted
    ? { bg: '', topGlow: '#1FFFFFFF', text: primary, muted: secondary, startBg: '#33FFFFFF', startText: primary, endBg: '#33FFFFFF', endText: primary }
    : getPalette();
  const totalSecs = Math.max(0, props.durationSeconds ?? 1500);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const formattedTime = `${mins < 10 ? `0${mins}` : mins}:${secs < 10 ? `0${secs}` : secs}`;

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <HStack modifiers={[padding({ horizontal: 8, vertical: 5 }), background(p.topGlow), cornerRadius(8)]}>
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(p.text)]}>
          {props.taskLabel || 'Focus'}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 9, weight: 'bold' }), foregroundStyle(p.muted)]}>
          {props.isRunning ? 'ACTIVE' : 'READY'}
        </Text>
      </HStack>

      <Spacer />

      <Text modifiers={[font({ size: 30, weight: 'bold' }), foregroundStyle(p.text), ...accent]}>
        {formattedTime}
      </Text>

      <Spacer />

      <HStack
        modifiers={[
          frame({ width: 112, height: 30 }),
          background(props.isRunning ? p.endBg : p.startBg),
          cornerRadius(15),
          ...accent,
        ]}
      >
        <Button
          label={props.isRunning ? 'End' : 'Start'}
          modifiers={[
            font({ size: 13, weight: 'bold' }),
            foregroundStyle(props.isRunning ? p.endText : p.startText),
          ]}
          onPress={() => {
            const now = Date.now();
            if (props.isRunning) {
              return {
                ...props,
                isRunning: false,
                durationSeconds: 1500,
                endTimeMs: 0,
                lastAction: 'end',
                source: 'widget',
                updatedAtMs: now,
              };
            }
            const startSecs =
              props.durationSeconds && props.durationSeconds > 0 ? props.durationSeconds : 1500;
            return {
              ...props,
              isRunning: true,
              durationSeconds: startSecs,
              endTimeMs: now + startSecs * 1000,
              lastAction: 'start',
              source: 'widget',
              updatedAtMs: now,
            };
          }}
        />
      </HStack>
    </VStack>
  );
};

export default safeCreateWidget<PomodoroWidgetProps>('PomodoroWidget', PomodoroWidget, {
  preset: 'cobalt',
  systemScheme: 'dark',
  taskLabel: 'Focus',
  durationSeconds: 1500,
  isRunning: false,
  lastAction: 'none',
});
