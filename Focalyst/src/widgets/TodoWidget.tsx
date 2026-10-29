import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { TodoItem, TodoWidgetProps, WidgetEnv } from './types';

const TodoWidget = (rawProps: TodoWidgetProps, env?: WidgetEnv) => {
  'widget';
  // Gallery and placeholder entries arrive without props: show a realistic sample instead.
  const props = {
    title: 'To-Do List',
    tasks: [
      { id: 'sample-1', title: 'Plan the week', completed: false },
      { id: 'sample-2', title: 'Read 20 pages', completed: false },
      { id: 'sample-3', title: 'Gym session', completed: false },
    ],
    ...(rawProps as Partial<TodoWidgetProps>),
  };
  const preset = props.preset ?? 'cobalt';
  const isDark = (env?.colorScheme ?? props.systemScheme ?? 'dark') === 'dark';
  const isMedium = env?.widgetFamily === 'systemMedium';
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
      return { text: '#FFFFFF', taskText: '#FFFFFF', secondaryText: rgba(WHITE, 0.6), pill: rgba(WHITE, 0.14), accent: '#FFFFFF' };
    }
    if (preset === 'monochrome') {
      return isDark
        ? { text: '#FFFFFF', taskText: '#FFFFFF', secondaryText: rgba(WHITE, 0.6), pill: rgba(WHITE, 0.1), accent: '#FFFFFF' }
        : { text: '#0B0B0F', taskText: '#0B0B0F', secondaryText: rgba(INK, 0.55), pill: rgba(INK, 0.06), accent: '#0B0B0F' };
    }
    if (preset === 'white') {
      return { text: '#090A0F', taskText: '#1E293B', secondaryText: '#475569', pill: rgba('9, 10, 15', 0.06), accent: '#090A0F' };
    }
    const themes: Record<string, { taskText: string; secondaryText: string; accent: string }> = {
      ember: { taskText: '#FFEDD5', secondaryText: '#FDBA74', accent: '#FF5500' },
      cobalt: { taskText: '#E0F2FE', secondaryText: '#93C5FD', accent: '#60A5FA' },
      emerald: { taskText: '#D1FAE5', secondaryText: '#6EE7B7', accent: '#34D399' },
      violet: { taskText: '#EDE9FE', secondaryText: '#C4B5FD', accent: '#A78BFA' },
      crimson: { taskText: '#FFE4E6', secondaryText: '#FDA4AF', accent: '#FB7185' },
      amber: { taskText: '#FEF3C7', secondaryText: '#FDE68A', accent: '#FBBF24' },
    };
    const theme = themes[preset] ?? themes.cobalt;
    return { text: '#FFFFFF', taskText: theme.taskText, secondaryText: theme.secondaryText, pill: rgba(WHITE, 0.1), accent: theme.accent };
  };

  const p = makePalette();
  const accentable: any[] = isAccented ? [{ $type: 'widgetAccentable', accentable: true }] : [];
  const safeTasks = Array.isArray(props.tasks) ? props.tasks : [];
  const pendingTasks = safeTasks.filter((t) => !t.completed);
  const maxChars = isMedium ? 32 : 15;
  const visibleTasks = pendingTasks.slice(0, 3);

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      {/* Header Bar */}
      <HStack modifiers={[padding({ horizontal: 8, vertical: 5 }), background(p.pill), cornerRadius(8)]}>
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(p.text)]}>
          To-Do List
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(p.accent), ...accentable]}>
          {`${pendingTasks.length}`}
        </Text>
      </HStack>

      {/* Tasks positioned directly below Header Bar (NO Spacer above tasks!) */}
      {visibleTasks.length === 0 ? (
        <VStack modifiers={[padding({ top: 18 })]}>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(p.secondaryText)]}>
            No tasks yet
          </Text>
          <Text modifiers={[font({ size: 10, weight: 'regular' }), foregroundStyle(p.secondaryText)]}>
            Tap + in app to add
          </Text>
        </VStack>
      ) : (
        <VStack modifiers={[padding({ top: 6 })]}>
          {visibleTasks.map((task) => {
            const labelText =
              task.title.length > maxChars ? `${task.title.slice(0, maxChars)}…` : task.title;
            return (
              <HStack key={task.id} modifiers={[padding({ vertical: 2 })]}>
                <Button
                  label={`○  ${labelText}`}
                  modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(p.taskText), ...accentable]}
                  onPress={() => {
                    const realTasks = Array.isArray(rawProps.tasks) ? rawProps.tasks : [];
                    const prevCompleted = Array.isArray(rawProps.completedTaskIds) ? rawProps.completedTaskIds : [];
                    return {
                      ...rawProps,
                      lastCompletedTaskId: task.id,
                      completedTaskIds: [...prevCompleted, task.id],
                      tasks: realTasks.map((t) =>
                        t.id === task.id ? { ...t, completed: true } : t
                      ),
                    };
                  }}
                />
                <Spacer />
              </HStack>
            );
          })}
        </VStack>
      )}

      {/* Single Spacer at the bottom keeps tasks pinned right below To-Do List header */}
      <Spacer />
    </VStack>
  );
};

export default safeCreateWidget<TodoWidgetProps>('TodoWidget', TodoWidget, {
  preset: 'cobalt',
  systemScheme: 'dark',
  title: 'To-Do List',
  tasks: [] as TodoItem[],
  completedTaskIds: [] as string[],
});
