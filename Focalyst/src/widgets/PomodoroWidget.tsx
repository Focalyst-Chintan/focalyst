import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { PomodoroWidgetProps, WidgetEnv } from './types';

const PomodoroWidget = (rawProps: PomodoroWidgetProps, env?: WidgetEnv) => {
  'widget';
  // Gallery and placeholder entries arrive without props: show a realistic sample instead.
  const props = { taskLabel: 'Focus', durationSeconds: 1500, isRunning: false, ...(rawProps as Partial<PomodoroWidgetProps>) };
  const preset = props.preset ?? 'cobalt';
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
      return {
        text: '#FFFFFF', secondaryText: rgba(WHITE, 0.6), pill: rgba(WHITE, 0.14),
        button: rgba(WHITE, 0.18), buttonText: '#FFFFFF', stop: rgba(WHITE, 0.18), stopText: '#FFFFFF',
      };
    }
    if (preset === 'monochrome') {
      return isDark
        ? {
            text: '#FFFFFF', secondaryText: rgba(WHITE, 0.6), pill: rgba(WHITE, 0.1),
            button: '#FFFFFF', buttonText: '#0B0B0F', stop: '#EF4444', stopText: '#FFFFFF',
          }
        : {
            text: '#0B0B0F', secondaryText: rgba(INK, 0.55), pill: rgba(INK, 0.06),
            button: '#0B0B0F', buttonText: '#FFFFFF', stop: '#DC2626', stopText: '#FFFFFF',
          };
    }
    if (preset === 'white') {
      return {
        text: '#090A0F', secondaryText: '#475569', pill: rgba('9, 10, 15', 0.06),
        button: '#090A0F', buttonText: '#FFFFFF', stop: '#DC2626', stopText: '#FFFFFF',
      };
    }
    const themes: Record<string, { secondaryText: string; stop: string }> = {
      ember: { secondaryText: '#FDBA74', stop: '#EF4444' },
      cobalt: { secondaryText: '#93C5FD', stop: '#EF4444' },
      emerald: { secondaryText: '#6EE7B7', stop: '#EF4444' },
      violet: { secondaryText: '#C4B5FD', stop: '#EF4444' },
      crimson: { secondaryText: '#FDA4AF', stop: '#F43F5E' },
      amber: { secondaryText: '#FDE68A', stop: '#EF4444' },
    };
    const theme = themes[preset] ?? themes.cobalt;
    return {
      text: '#FFFFFF', secondaryText: theme.secondaryText, pill: rgba(WHITE, 0.1),
      button: '#FFFFFF', buttonText: '#090A0F', stop: theme.stop, stopText: '#FFFFFF',
    };
  };

  const p = makePalette();
  const accentable: any[] = isAccented ? [{ $type: 'widgetAccentable', accentable: true }] : [];
  // Whole, finite seconds only: NaN or fractions would print as "NaN:NaN" or "25:0.5".
  const rawSecs = Number(props.durationSeconds ?? 1500);
  const totalSecs = Number.isFinite(rawSecs) ? Math.max(0, Math.floor(rawSecs)) : 1500;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const formattedTime = `${mins < 10 ? `0${mins}` : mins}:${secs < 10 ? `0${secs}` : secs}`;

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <HStack modifiers={[padding({ horizontal: 8, vertical: 5 }), background(p.pill), cornerRadius(8)]}>
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(p.text)]}>
          {props.taskLabel || 'Focus'}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 9, weight: 'bold' }), foregroundStyle(p.secondaryText)]}>
          {props.isRunning ? 'ACTIVE' : 'READY'}
        </Text>
      </HStack>

      <Spacer />

      <Text modifiers={[font({ size: 30, weight: 'bold' }), foregroundStyle(p.text), ...accentable]}>
        {formattedTime}
      </Text>

      <Spacer />

      <HStack
        modifiers={[
          frame({ width: 112, height: 30 }),
          background(props.isRunning ? p.stop : p.button),
          cornerRadius(15),
          ...accentable,
        ]}
      >
        <Button
          label={props.isRunning ? 'End' : 'Start'}
          modifiers={[
            font({ size: 13, weight: 'bold' }),
            foregroundStyle(props.isRunning ? p.stopText : p.buttonText),
          ]}
          onPress={() => {
            const now = Date.now();
            if (rawProps.isRunning) {
              return {
                ...rawProps,
                isRunning: false,
                durationSeconds: 1500,
                endTimeMs: 0,
                lastAction: 'end',
                source: 'widget',
                updatedAtMs: now,
              };
            }
            const startSecs =
              rawProps.durationSeconds && rawProps.durationSeconds > 0 ? rawProps.durationSeconds : 1500;
            return {
              ...rawProps,
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
