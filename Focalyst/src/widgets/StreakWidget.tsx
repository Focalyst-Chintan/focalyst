import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { HabitHeatmapItem, StreakWidgetProps, WidgetEnv } from './types';

const StreakWidget = (rawProps: StreakWidgetProps, env?: WidgetEnv) => {
  'widget';
  const props = {
    habitName: '',
    streakDays: 0,
    totalDays: 0,
    goalDays: 30,
    habits: [],
    ...(rawProps as Partial<StreakWidgetProps>),
  };
  const preset = props.preset ?? 'ember';
  const isDark = (env?.colorScheme ?? props.systemScheme ?? 'dark') === 'dark';
  const isMedium = env?.widgetFamily === 'systemMedium';
  const mode = env?.widgetRenderingMode;
  const isAccented = mode === 'accented' || mode === 'vibrant';
  const rgba = (rgb: string, alpha: number) => `rgba(${rgb}, ${alpha})`;
  const fill = 1000;

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

  const getLocalTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const todayStr = getLocalTodayStr();
  const isStaleDay = Boolean(rawProps.snapshotDate && rawProps.snapshotDate !== todayStr);

  const habitList: HabitHeatmapItem[] = Array.isArray(props.habits) ? props.habits.filter((h) => h && typeof h === 'object') : [];

  const completedCount = isStaleDay
    ? 0
    : habitList.filter((h) => Boolean(h.completedToday)).length;
  const leftHabits = habitList.slice(0, 3);
  const rightHabits = habitList.slice(3, 6);

  const renderHabitRow = (h: HabitHeatmapItem) => {
    const isDone = isStaleDay ? false : Boolean(h.completedToday);
    const streak = Math.max(0, Math.floor(Number(h.streakDays ?? h.totalDays) || 0));
    const name = `${h.habitName ?? ''}`.trim() || 'Habit';

    return (
      <Button
        key={h.id}
        target={`habit-${h.id}`}
        modifiers={[buttonStyle('plain')]}
        onPress={() => {
          const tapTodayStr = getLocalTodayStr();
          const tapIsStale = Boolean(rawProps.snapshotDate && rawProps.snapshotDate !== tapTodayStr);
          const currentHabits =
            Array.isArray(rawProps.habits) && rawProps.habits.length > 0 ? rawProps.habits : habitList;
          const prevMap =
            !tapIsStale && rawProps.toggledHabitMap && typeof rawProps.toggledHabitMap === 'object'
              ? rawProps.toggledHabitMap
              : {};
          const wasDone = tapIsStale ? false : Boolean(h.completedToday);
          const nextDone = !wasDone;
          const curStreak = Math.max(0, Math.floor(Number(h.streakDays ?? h.totalDays) || 0));
          const nextStreak = nextDone ? curStreak + 1 : Math.max(0, curStreak - 1);
          const curTotal = Math.max(0, Math.floor(Number(h.totalDays) || 0));
          const nextTotal = nextDone ? curTotal + 1 : Math.max(0, curTotal - 1);
          const nowMs = Date.now();

          const nextHabits = currentHabits.map((item) => {
            if (item.id === h.id) {
              return {
                ...item,
                completedToday: nextDone,
                streakDays: nextStreak,
                totalDays: nextTotal,
              };
            }
            return tapIsStale ? { ...item, completedToday: false } : item;
          });

          return {
            ...rawProps,
            snapshotDate: tapTodayStr,
            habits: nextHabits,
            lastToggledHabitId: h.id,
            toggledHabitMap: {
              ...prevMap,
              [h.id]: { completed: nextDone, date: tapTodayStr, updatedAtMs: nowMs },
            },
            updatedAtMs: nowMs,
          };
        }}
      >
        <HStack
          spacing={6}
          modifiers={[
            padding({ horizontal: 8, vertical: 4.5 }),
            background(p.pill),
            cornerRadius(7),
            frame({ maxWidth: fill, alignment: 'leading' }),
          ]}
        >
          <Text
            modifiers={[
              font({ size: 11, weight: 'bold' }),
              foregroundStyle(isDone ? p.accent : p.secondaryText),
              ...accentable,
            ]}
          >
            {isDone ? '✓' : '○'}
          </Text>
          <Text
            modifiers={[
              font({ size: 11, weight: 'semibold' }),
              foregroundStyle(p.text),
              lineLimit(1),
              truncationMode('tail'),
            ]}
          >
            {name}
          </Text>
          <Spacer minLength={4} />
          <Text
            modifiers={[
              font({ size: 10, weight: 'bold' }),
              foregroundStyle(isDone ? p.accent : p.secondaryText),
              lineLimit(1),
              ...accentable,
            ]}
          >
            {`🔥 ${streak}d`}
          </Text>
        </HStack>
      </Button>
    );
  };

  return (
    <VStack
      alignment="leading"
      spacing={6}
      modifiers={[
        padding({ all: 11 }),
        frame({ maxWidth: fill, maxHeight: fill, alignment: 'topLeading' }),
      ]}
    >
      {/* Top Header Band */}
      <HStack
        modifiers={[
          padding({ horizontal: 8, vertical: 5 }),
          background(p.pill),
          cornerRadius(8),
          frame({ maxWidth: fill }),
        ]}
      >
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(p.text), lineLimit(1)]}>
          Habits
        </Text>
        <Spacer minLength={4} />
        <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(p.accent), ...accentable]}>
          {`${completedCount}/${habitList.length}`}
        </Text>
      </HStack>

      {/* Multi-Habit Checklist */}
      {habitList.length === 0 ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle(p.secondaryText), frame({ maxWidth: fill, maxHeight: fill, alignment: 'center' })]}>No habits yet</Text>
      ) : isMedium ? (
        <HStack alignment="top" spacing={8} modifiers={[frame({ maxWidth: fill, alignment: 'topLeading' })]}>
          <VStack alignment="leading" spacing={5} modifiers={[frame({ maxWidth: fill, alignment: 'topLeading' })]}>
            {leftHabits.map(renderHabitRow)}
          </VStack>
          <VStack alignment="leading" spacing={5} modifiers={[frame({ maxWidth: fill, alignment: 'topLeading' })]}>
            {rightHabits.map(renderHabitRow)}
          </VStack>
        </HStack>
      ) : (
        <VStack alignment="leading" spacing={5} modifiers={[frame({ maxWidth: fill, alignment: 'topLeading' })]}>
          {leftHabits.map(renderHabitRow)}
        </VStack>
      )}

      <Spacer minLength={0} />
    </VStack>
  );
};

export default safeCreateWidget<StreakWidgetProps>('StreakWidget', StreakWidget, {
  preset: 'ember',
  systemScheme: 'dark',
  habitName: '',
  streakDays: 0,
  totalDays: 0,
  goalDays: 30,
  habits: [],
  toggledHabitMap: {},
});
