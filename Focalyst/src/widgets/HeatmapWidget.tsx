import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { HeatmapWidgetProps, WidgetEnv } from './types';

const HeatmapWidget = (rawProps: HeatmapWidgetProps, env?: WidgetEnv) => {
  'widget';
  // Gallery and placeholder entries arrive without props: show a realistic sample instead.
  const props = {
    habitName: 'Yoga',
    totalDays: 26,
    gridLevels: [
      0, 0, 1, 2, 3, 4, 2,
      1, 0, 2, 3, 4, 3, 1,
      2, 3, 4, 2, 4, 3, 2,
      0, 1, 2, 3, 4, 4, 3,
      2, 3, 4, 0, 0, 0, 0,
    ],
    ...(rawProps as Partial<HeatmapWidgetProps>),
  };
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
    const ramp = (rgb: string, steps: number[]) => steps.map((alpha) => rgba(rgb, alpha));
    if (isAccented) {
      return { text: '#FFFFFF', secondaryText: rgba(WHITE, 0.6), pill: rgba(WHITE, 0.14), heat: ramp(WHITE, [0.1, 0.28, 0.48, 0.72, 1]) };
    }
    if (preset === 'monochrome') {
      return isDark
        ? { text: '#FFFFFF', secondaryText: rgba(WHITE, 0.6), pill: rgba(WHITE, 0.1), heat: ramp(WHITE, [0.08, 0.25, 0.45, 0.7, 1]) }
        : { text: '#0B0B0F', secondaryText: rgba(INK, 0.55), pill: rgba(INK, 0.06), heat: ramp(INK, [0.06, 0.25, 0.45, 0.7, 1]) };
    }
    if (preset === 'white') {
      return { text: '#090A0F', secondaryText: '#475569', pill: rgba('9, 10, 15', 0.06), heat: ramp('9, 10, 15', [0.06, 0.25, 0.45, 0.7, 1]) };
    }
    // Colour themes keep their hue: the ramp is the theme colour at rising opacity.
    const themes: Record<string, { secondaryText: string; heatRgb: string }> = {
      ember: { secondaryText: '#FDBA74', heatRgb: '234, 88, 12' },
      cobalt: { secondaryText: '#93C5FD', heatRgb: '59, 130, 246' },
      emerald: { secondaryText: '#6EE7B7', heatRgb: '16, 185, 129' },
      violet: { secondaryText: '#C4B5FD', heatRgb: '124, 58, 237' },
      crimson: { secondaryText: '#FDA4AF', heatRgb: '225, 29, 72' },
      amber: { secondaryText: '#FDE68A', heatRgb: '217, 119, 6' },
    };
    const theme = themes[preset] ?? themes.cobalt;
    return { text: '#FFFFFF', secondaryText: theme.secondaryText, pill: rgba(WHITE, 0.1), heat: ramp(theme.heatRgb, [0.14, 0.32, 0.52, 0.76, 1]) };
  };

  const p = makePalette();
  const accentable: any[] = isAccented ? [{ $type: 'widgetAccentable', accentable: true }] : [];
  const habitList = Array.isArray(props.habits) && props.habits.length > 0
    ? props.habits
    : [{ id: 'default', habitName: props.habitName || 'Yoga', totalDays: props.totalDays ?? 0, gridLevels: props.gridLevels || [] }];

  const currentIndex = (props.activeHabitIndex ?? 0) % habitList.length;
  const activeHabit = habitList[currentIndex] || habitList[0];
  const hasMultiple = habitList.length > 1;

  const rows = [0, 1, 2, 3, 4];
  const cols = [0, 1, 2, 3, 4, 5, 6];

  return (
    <VStack modifiers={[padding({ all: 11 })]}>
      <HStack modifiers={[padding({ horizontal: 8, vertical: 4 }), background(p.pill), cornerRadius(8)]}>
        {hasMultiple ? (
          <Button
            label={`${activeHabit.habitName} ▸`}
            modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(p.text)]}
            onPress={() => ({
              ...rawProps,
              activeHabitIndex: (currentIndex + 1) % habitList.length,
            })}
          />
        ) : (
          <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(p.text)]}>
            {activeHabit.habitName}
          </Text>
        )}
        <Spacer />
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(p.secondaryText)]}>
          {`${activeHabit.totalDays}d`}
        </Text>
      </HStack>

      <Spacer />

      <VStack>
        {rows.map((r) => (
          <HStack key={`row-${r}`} modifiers={[padding({ vertical: 1.5 })]}>
            {cols.map((c) => {
              const idx = r * 7 + c;
              const lvl = Math.max(0, Math.min(4, activeHabit.gridLevels?.[idx] ?? 0));
              return (
                <VStack
                  key={`cell-${idx}`}
                  modifiers={[frame({ width: 13.5, height: 13.5 }), background(p.heat[lvl]), cornerRadius(3.5), ...(lvl > 0 ? accentable : [])]}
                >
                  {null}
                </VStack>
              );
            })}
          </HStack>
        ))}
      </VStack>
    </VStack>
  );
};

export default safeCreateWidget<HeatmapWidgetProps>('HeatmapWidget', HeatmapWidget, {
  preset: 'cobalt',
  systemScheme: 'dark',
  habitName: 'Yoga',
  totalDays: 26,
  gridLevels: [
    0, 0, 1, 2, 3, 4, 2,
    1, 0, 2, 3, 4, 3, 1,
    2, 3, 4, 2, 4, 3, 2,
    0, 1, 2, 3, 4, 4, 3,
    2, 3, 4, 0, 0, 0, 0,
  ],
  habits: [],
  activeHabitIndex: 0,
});
