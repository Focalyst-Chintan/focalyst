import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, buttonStyle, cornerRadius, font, foregroundStyle, frame, lineLimit, padding, truncationMode } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { HeatmapWidgetProps, WidgetEnv } from './types';

const HeatmapWidget = (props: HeatmapWidgetProps, env?: WidgetEnv) => {
  'widget';
  const scheme = env?.colorScheme ?? props.systemScheme ?? 'dark';
  const isDark = scheme === 'dark';
  const preset = props.preset ?? 'cobalt';

  const getTheme = () => {
    if (preset === 'white' || (preset === 'monochrome' && !isDark)) {
      return { bg: '#F8FAFC', headerBg: '#E2E8F0', text: '#090A0F', muted: '#475569', levels: ['#E2E8F0', '#94A3B8', '#64748B', '#334155', '#090A0F'] };
    }
    if (preset === 'monochrome') {
      return { bg: '#090A0F', headerBg: '#161922', text: '#FFFFFF', muted: '#94A3B8', levels: ['#181B24', '#3F3F46', '#71717A', '#D4D4D8', '#FFFFFF'] };
    }
    const ramps: Record<string, any> = {
      ember: { bg: '#140703', headerBg: '#3D1409', text: '#FFFFFF', muted: '#FDBA74', levels: ['#291008', '#7C2D12', '#EA580C', '#FB923C', '#FFEDD5'] },
      cobalt: { bg: '#060C1A', headerBg: '#122652', text: '#FFFFFF', muted: '#93C5FD', levels: ['#111E3B', '#1D4ED8', '#3B82F6', '#60A5FA', '#DBEAFE'] },
      emerald: { bg: '#04120D', headerBg: '#0D3627', text: '#FFFFFF', muted: '#6EE7B7', levels: ['#0C291E', '#047857', '#10B981', '#34D399', '#D1FAE5'] },
      violet: { bg: '#0A0517', headerBg: '#2B145E', text: '#FFFFFF', muted: '#C4B5FD', levels: ['#1B0E3B', '#5B21B6', '#7C3AED', '#A78BFA', '#EDE9FE'] },
      crimson: { bg: '#160408', headerBg: '#4F0F1B', text: '#FFFFFF', muted: '#FDA4AF', levels: ['#2E0911', '#9F1239', '#E11D48', '#FB7185', '#FFE4E6'] },
      amber: { bg: '#140D03', headerBg: '#472C09', text: '#FFFFFF', muted: '#FDE68A', levels: ['#2B1C07', '#92400E', '#D97706', '#FBBF24', '#FEF3C7'] },
    };
    return ramps[preset] ?? ramps.cobalt;
  };

  const t = getTheme();
  const fallbackHabit = Array.isArray(props.habits) && props.habits.length > 0 ? props.habits[0] : null;
  const activeHabitId = props.habitId || fallbackHabit?.id || 'default';
  const displayHabitName = props.habitName || fallbackHabit?.habitName || '';
  const displayTotalDays = props.totalDays ?? fallbackHabit?.totalDays ?? 0;
  const displayCompletedToday = Boolean(props.completedToday ?? fallbackHabit?.completedToday);
  const displayGridLevels =
    Array.isArray(props.gridLevels) && props.gridLevels.length > 0
      ? props.gridLevels
      : fallbackHabit?.gridLevels || [];

  const getTodayCellIdx = () => {
    if (typeof props.todayCellIndex === 'number' && props.todayCellIndex >= 0 && props.todayCellIndex < 35) {
      return props.todayCellIndex;
    }
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    return offset + now.getDate() - 1;
  };

  const rows = [0, 1, 2, 3, 4];
  const cols = [0, 1, 2, 3, 4, 5, 6];

  return (
    <VStack modifiers={[padding({ all: 11 }), background(t.bg)]}>
      <Button
        target={`heatmap-toggle-${activeHabitId}`}
        modifiers={[buttonStyle('plain')]}
        onPress={() => {
          const nextDone = !displayCompletedToday;
          const curTotal = Math.max(0, Math.floor(Number(displayTotalDays) || 0));
          const nextTotal = nextDone ? curTotal + 1 : Math.max(0, curTotal - 1);
          const curGrid = [...displayGridLevels];
          const todayIdx = getTodayCellIdx();
          if (todayIdx >= 0 && todayIdx < 35) {
            while (curGrid.length < 35) curGrid.push(0);
            curGrid[todayIdx] = nextDone ? 4 : 1;
          }
          const prevMap =
            props.toggledHabitMap && typeof props.toggledHabitMap === 'object'
              ? props.toggledHabitMap
              : {};
          return {
            ...props,
            habitId: activeHabitId,
            completedToday: nextDone,
            totalDays: nextTotal,
            gridLevels: curGrid,
            lastToggledHabitId: activeHabitId,
            toggledHabitMap: { ...prevMap, [activeHabitId]: nextDone },
            updatedAtMs: Date.now(),
          };
        }}
      >
        <HStack modifiers={[padding({ horizontal: 8, vertical: 5 }), background(t.headerBg), cornerRadius(8)]}>
          <Text
            modifiers={[
              font({ size: 12, weight: 'bold' }),
              foregroundStyle(t.text),
              lineLimit(1),
              truncationMode('tail'),
            ]}
          >
            {displayHabitName}
          </Text>
          <Spacer minLength={4} />
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(t.muted)]}>
            {`${displayTotalDays}d`}
          </Text>
        </HStack>
      </Button>

      <Spacer />

      <VStack>
        {rows.map((r) => (
          <HStack key={`row-${r}`} modifiers={[padding({ vertical: 1.5 })]}>
            {cols.map((c) => {
              const idx = r * 7 + c;
              const lvl = Math.max(0, Math.min(4, displayGridLevels[idx] ?? 0));
              return (
                <VStack
                  key={`cell-${idx}`}
                  modifiers={[frame({ width: 13.5, height: 13.5 }), background(t.levels[lvl]), cornerRadius(3.5)]}
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
  habitName: '',
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
