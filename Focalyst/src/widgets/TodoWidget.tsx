import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  border,
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
  const fill = 1000;

  // Clear and Tinted render in the accented mode, which keeps only opacity: every fill there is
  // white at a fixed alpha. Colours are rgba() because natively an 8-digit hex reads as RRGGBBAA.
  // The background itself is the widget's containerBackground (FocalystThemeBackground in Swift).
  const makePalette = () => {
    const WHITE = '255, 255, 255';
    const INK = '11, 11, 15';
    if (isAccented) {
      return {
        text: '#FFFFFF',
        taskText: '#FFFFFF',
        secondaryText: rgba(WHITE, 0.6),
        pill: rgba(WHITE, 0.14),
        ghostBg: rgba(WHITE, 0.04),
        ghostBorder: rgba(WHITE, 0.14),
        accent: '#FFFFFF',
      };
    }
    if (preset === 'monochrome') {
      return isDark
        ? {
            text: '#FFFFFF',
            taskText: '#FFFFFF',
            secondaryText: rgba(WHITE, 0.6),
            pill: rgba(WHITE, 0.1),
            ghostBg: rgba(WHITE, 0.025),
            ghostBorder: rgba(WHITE, 0.08),
            accent: '#FFFFFF',
          }
        : {
            text: '#0B0B0F',
            taskText: '#0B0B0F',
            secondaryText: rgba(INK, 0.55),
            pill: rgba(INK, 0.06),
            ghostBg: rgba(INK, 0.025),
            ghostBorder: rgba(INK, 0.08),
            accent: '#0B0B0F',
          };
    }
    if (preset === 'white') {
      return {
        text: '#090A0F',
        taskText: '#1E293B',
        secondaryText: '#475569',
        pill: rgba('9, 10, 15', 0.06),
        ghostBg: rgba('9, 10, 15', 0.025),
        ghostBorder: rgba('9, 10, 15', 0.08),
        accent: '#090A0F',
      };
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
    return {
      text: '#FFFFFF',
      taskText: theme.taskText,
      secondaryText: theme.secondaryText,
      pill: rgba(WHITE, 0.1),
      ghostBg: rgba(WHITE, 0.025),
      ghostBorder: rgba(WHITE, 0.08),
      accent: theme.accent,
    };
  };

  const p = makePalette();
  const accentable: any[] = isAccented ? [{ $type: 'widgetAccentable', accentable: true }] : [];
  const safeTasks = Array.isArray(props.tasks) ? props.tasks.filter((t) => t && typeof t === 'object') : [];
  const pendingTasks = safeTasks.filter((t) => !t.completed);
  const leftTasks = pendingTasks.slice(0, 3);
  const rightTasks = pendingTasks.slice(3, 6);
  const smallTasks = pendingTasks.slice(0, 3);

  const renderTaskPill = (task: TodoItem) => {
    const title = `${task.title ?? ''}`.trim() || 'Task';
    return (
      <Button
        key={task.id}
        target={`todo-${task.id}`}
        modifiers={[buttonStyle('plain')]}
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
      >
        <HStack
          alignment="center"
          spacing={8}
          modifiers={[
            padding({ horizontal: 9, vertical: 5 }),
            background(p.pill),
            cornerRadius(8),
            frame({ maxWidth: fill, minHeight: 30, maxHeight: fill, alignment: 'leading' }),
          ]}
        >
          <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(p.accent), ...accentable]}>
            ○
          </Text>
          <Text
            modifiers={[
              font({ size: 13, weight: 'medium' }),
              foregroundStyle(p.taskText),
              lineLimit(1),
              truncationMode('tail'),
              ...accentable,
            ]}
          >
            {title}
          </Text>
          <Spacer minLength={0} />
        </HStack>
      </Button>
    );
  };

  const renderGhostSlot = (slotIdx: number, showLabel: boolean) => (
    <HStack
      key={`ghost-${slotIdx}`}
      alignment="center"
      modifiers={[
        padding({ horizontal: 9, vertical: 5 }),
        background(p.ghostBg),
        cornerRadius(8),
        border({ content: p.ghostBorder, width: 1 }),
        frame({ maxWidth: fill, minHeight: 30, maxHeight: fill, alignment: 'leading' }),
      ]}
    >
      <Text
        modifiers={[
          font({ size: 11, weight: 'medium' }),
          foregroundStyle(p.secondaryText),
          lineLimit(1),
        ]}
      >
        {showLabel ? 'No more tasks' : ' '}
      </Text>
      <Spacer minLength={0} />
    </HStack>
  );

  return (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[
        padding({ all: 12 }),
        frame({ maxWidth: fill, maxHeight: fill, alignment: 'topLeading' }),
      ]}
    >
      {/* Fixed Top Header Band */}
      <HStack
        modifiers={[
          padding({ horizontal: 8, vertical: 5 }),
          background(p.pill),
          cornerRadius(8),
          frame({ maxWidth: fill }),
        ]}
      >
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(p.text), lineLimit(1)]}>
          To-Do List
        </Text>
        <Spacer minLength={4} />
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(p.accent), ...accentable]}>
          {`${pendingTasks.length}`}
        </Text>
      </HStack>

      {/* Tasks positioned directly below Header Bar */}
      {isMedium ? (
        <HStack
          alignment="top"
          spacing={8}
          modifiers={[frame({ maxWidth: fill, maxHeight: fill, alignment: 'topLeading' })]}
        >
          <VStack
            alignment="leading"
            spacing={8}
            modifiers={[frame({ maxWidth: fill, maxHeight: fill, alignment: 'topLeading' })]}
          >
            {[0, 1, 2].map((slotIdx) => {
              const task = leftTasks[slotIdx];
              if (task) return renderTaskPill(task);
              return renderGhostSlot(slotIdx, slotIdx === leftTasks.length);
            })}
          </VStack>
          <VStack
            alignment="leading"
            spacing={8}
            modifiers={[frame({ maxWidth: fill, maxHeight: fill, alignment: 'topLeading' })]}
          >
            {[0, 1, 2].map((slotIdx) => {
              const task = rightTasks[slotIdx];
              if (task) return renderTaskPill(task);
              return renderGhostSlot(10 + slotIdx, false);
            })}
          </VStack>
        </HStack>
      ) : (
        <VStack
          alignment="leading"
          spacing={8}
          modifiers={[frame({ maxWidth: fill, maxHeight: fill, alignment: 'topLeading' })]}
        >
          {[0, 1, 2].map((slotIdx) => {
            const task = smallTasks[slotIdx];
            if (task) return renderTaskPill(task);
            return renderGhostSlot(slotIdx, slotIdx === smallTasks.length);
          })}
        </VStack>
      )}
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
