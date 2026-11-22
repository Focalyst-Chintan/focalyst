import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { aspectRatio, background, buttonStyle, cornerRadius, font, foregroundStyle, frame, lineLimit, padding, truncationMode } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { HeatmapWidgetProps, WidgetEnv } from './types';

const HeatmapWidget = (rawProps: HeatmapWidgetProps, env?: WidgetEnv) => {
  'widget';
  // Gallery and placeholder entries arrive without props: show a realistic sample instead.
  const props = {
    habitName: '',
    totalDays: 0,
    gridLevels: Array(35).fill(0),
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
  const getLocalTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const todayStr = getLocalTodayStr();
  const isStaleDay = Boolean(rawProps.snapshotDate && rawProps.snapshotDate !== todayStr);

  const fallbackHabit = Array.isArray(props.habits) && props.habits.length > 0 ? props.habits[0] : null;
  const activeHabitId = props.habitId || fallbackHabit?.id || 'default';
  const displayHabitName = props.habitName || fallbackHabit?.habitName || '';
  const displayTotalDays = props.totalDays ?? fallbackHabit?.totalDays ?? 0;
  const displayCompletedToday = isStaleDay
    ? false
    : Boolean(props.completedToday ?? fallbackHabit?.completedToday);
  const displayGridLevels =
    Array.isArray(props.gridLevels) && props.gridLevels.length > 0
      ? props.gridLevels
      : fallbackHabit?.gridLevels || [];

  const getTodayCellIdx = () => {
    if (!isStaleDay && typeof props.todayCellIndex === 'number' && props.todayCellIndex >= 0 && props.todayCellIndex < 35) {
      return props.todayCellIndex;
    }
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    return offset + now.getDate() - 1;
  };

  const rows = [0, 1, 2, 3, 4];
  const cols = [0, 1, 2, 3, 4, 5, 6];
  // The fixed 13.5pt grid with default stack spacing (~165 x 170pt overall) is larger than a small
  // widget on smaller iPhones (148pt), so it was centred and clipped on every edge. Cells now share
  // the space left under the header: flexible slots, square cells, a fixed 3pt gap, and a grid kept
  // at the 7:5 shape (cell 14 + gap 3) so horizontal and vertical gaps stay equal. Grid is centred.
  const gap = 3;
  const gridRatio = (7 * 14 + 6 * gap) / (5 * 14 + 4 * gap);
  const fill = 1000; // "as large as offered": Infinity does not survive the JSON bridge

  return (
    <VStack spacing={8} modifiers={[padding({ all: 11 })]}>
      <Button
        target={`heatmap-toggle-${activeHabitId}`}
        modifiers={[buttonStyle('plain')]}
        onPress={() => {
          const tapTodayStr = getLocalTodayStr();
          const tapIsStale = Boolean(rawProps.snapshotDate && rawProps.snapshotDate !== tapTodayStr);
          const prevDone = tapIsStale
            ? false
            : Boolean(rawProps.completedToday ?? displayCompletedToday);
          const nextDone = !prevDone;
          const curTotal = Math.max(0, Math.floor(Number(rawProps.totalDays ?? displayTotalDays) || 0));
          const nextTotal = nextDone ? curTotal + 1 : Math.max(0, curTotal - 1);
          const curGrid =
            Array.isArray(rawProps.gridLevels) && rawProps.gridLevels.length > 0
              ? [...rawProps.gridLevels]
              : [...displayGridLevels];
          const todayIdx = getTodayCellIdx();
          if (todayIdx >= 0 && todayIdx < 35) {
            while (curGrid.length < 35) curGrid.push(0);
            curGrid[todayIdx] = nextDone ? 4 : 1;
          }
          const prevMap =
            !tapIsStale && rawProps.toggledHabitMap && typeof rawProps.toggledHabitMap === 'object'
              ? rawProps.toggledHabitMap
              : {};
          const nowMs = Date.now();
          const nextHabits = Array.isArray(rawProps.habits)
            ? rawProps.habits.map((h) => {
                if (h.id !== activeHabitId) {
                  return tapIsStale ? { ...h, completedToday: false } : h;
                }
                const curStreak = Math.max(0, Math.floor(Number(h.streakDays ?? h.totalDays) || 0));
                const nextStreak = nextDone ? curStreak + 1 : Math.max(0, curStreak - 1);
                return {
                  ...h,
                  completedToday: nextDone,
                  streakDays: nextStreak,
                  totalDays: nextTotal,
                  gridLevels: curGrid,
                };
              })
            : rawProps.habits;

          return {
            ...rawProps,
            snapshotDate: tapTodayStr,
            habitId: activeHabitId,
            completedToday: nextDone,
            totalDays: nextTotal,
            gridLevels: curGrid,
            habits: nextHabits,
            lastToggledHabitId: activeHabitId,
            toggledHabitMap: {
              ...prevMap,
              [activeHabitId]: { completed: nextDone, date: tapTodayStr, updatedAtMs: nowMs },
            },
            updatedAtMs: nowMs,
          };
        }}
      >
        <HStack modifiers={[padding({ horizontal: 8, vertical: 5 }), background(p.pill), cornerRadius(8)]}>
          <Text
            modifiers={[
              font({ size: 12, weight: 'bold' }),
              foregroundStyle(p.text),
              lineLimit(1),
              truncationMode('tail'),
            ]}
          >
            {`${displayHabitName}`}
          </Text>
          <Spacer minLength={4} />
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(p.secondaryText)]}>
            {`${Math.max(0, Math.floor(Number(displayTotalDays) || 0))}d`}
          </Text>
        </HStack>
      </Button>

      <VStack modifiers={[frame({ maxWidth: fill, maxHeight: fill })]}>
        <VStack spacing={gap} modifiers={[aspectRatio({ ratio: gridRatio, contentMode: 'fit' })]}>
          {rows.map((r) => (
            <HStack key={`row-${r}`} spacing={gap}>
              {cols.map((c) => {
                const idx = r * 7 + c;
                // A missing or non-numeric level is 0, so p.heat is never indexed with NaN.
                const raw = Number(displayGridLevels[idx]);
                const lvl = Number.isFinite(raw) ? Math.max(0, Math.min(4, Math.round(raw))) : 0;
                return (
                  <VStack
                    key={`cell-${idx}`}
                    modifiers={[
                      frame({ minWidth: 4, maxWidth: fill, minHeight: 4, maxHeight: fill }),
                      aspectRatio({ ratio: 1, contentMode: 'fit' }),
                      background(p.heat[lvl]),
                      cornerRadius(3.5),
                      ...(lvl > 0 ? accentable : []),
                    ]}
                  >
                    {null}
                  </VStack>
                );
              })}
            </HStack>
          ))}
        </VStack>
      </VStack>
    </VStack>
  );
};

export default safeCreateWidget<HeatmapWidgetProps>('HeatmapWidget', HeatmapWidget, {
  preset: 'cobalt',
  systemScheme: 'dark',
  habitName: '',
  totalDays: 0,
  gridLevels: Array(35).fill(0),
  habits: [],
  activeHabitIndex: 0,
});
