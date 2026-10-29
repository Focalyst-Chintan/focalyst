import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { TodoItem, TodoWidgetProps, WidgetEnv } from './types';

const TodoWidget = (props: TodoWidgetProps, env?: WidgetEnv) => {
  'widget';
  const scheme = env?.colorScheme ?? props.systemScheme ?? 'dark';
  const isDark = scheme === 'dark';
  const preset = props.preset ?? 'cobalt';
  const isMedium = env?.widgetFamily === 'systemMedium';

  const getPalette = () => {
    if (preset === 'white' || (preset === 'monochrome' && !isDark)) {
      return { bg: '#F8FAFC', headerBand: '#E2E8F0', rowBg: '#FFFFFF', text: '#090A0F', taskText: '#1E293B', muted: '#475569', badge: '#090A0F' };
    }
    if (preset === 'monochrome') {
      return { bg: '#090A0F', headerBand: '#161922', rowBg: '#12151E', text: '#FFFFFF', taskText: '#E2E8F0', muted: '#94A3B8', badge: '#FFFFFF' };
    }
    const map: Record<string, any> = {
      ember: { bg: '#160804', headerBand: '#4A180A', rowBg: '#260E07', text: '#FFFFFF', taskText: '#FFEDD5', muted: '#FDBA74', badge: '#FF5500' },
      cobalt: { bg: '#060D1F', headerBand: '#132E6E', rowBg: '#0C1938', text: '#FFFFFF', taskText: '#E0F2FE', muted: '#93C5FD', badge: '#60A5FA' },
      emerald: { bg: '#05140F', headerBand: '#0D3B2B', rowBg: '#09241B', text: '#FFFFFF', taskText: '#D1FAE5', muted: '#6EE7B7', badge: '#34D399' },
      violet: { bg: '#0C061C', headerBand: '#31176B', rowBg: '#160C30', text: '#FFFFFF', taskText: '#EDE9FE', muted: '#C4B5FD', badge: '#A78BFA' },
      crimson: { bg: '#190509', headerBand: '#54111D', rowBg: '#2B0910', text: '#FFFFFF', taskText: '#FFE4E6', muted: '#FDA4AF', badge: '#FB7185' },
      amber: { bg: '#170F04', headerBand: '#4F310A', rowBg: '#291B07', text: '#FFFFFF', taskText: '#FEF3C7', muted: '#FDE68A', badge: '#FBBF24' },
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
    ? { bg: '', headerBand: '#1FFFFFFF', rowBg: '#1FFFFFFF', text: primary, taskText: primary, muted: secondary, badge: primary }
    : getPalette();
  const safeTasks = Array.isArray(props.tasks) ? props.tasks : [];
  const pendingTasks = safeTasks.filter((t) => !t.completed);
  const maxChars = isMedium ? 32 : 15;
  const visibleTasks = pendingTasks.slice(0, 3);

  return (
    <VStack modifiers={[padding({ all: 12 }), ...(tinted ? [] : [background(p.bg)])]}>
      {/* Header Bar */}
      <HStack modifiers={[padding({ horizontal: 8, vertical: 5 }), background(p.headerBand), cornerRadius(8)]}>
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(p.text)]}>
          To-Do List
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(p.badge), ...accent]}>
          {`${pendingTasks.length}`}
        </Text>
      </HStack>

      {/* Tasks positioned directly below Header Bar (NO Spacer above tasks!) */}
      {visibleTasks.length === 0 ? (
        <VStack modifiers={[padding({ top: 18 })]}>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(p.muted)]}>
            No tasks yet
          </Text>
          <Text modifiers={[font({ size: 10, weight: 'regular' }), foregroundStyle(p.muted)]}>
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
                  modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(p.taskText), ...accent]}
                  onPress={() => {
                    const prevCompleted = Array.isArray(props.completedTaskIds) ? props.completedTaskIds : [];
                    return {
                      ...props,
                      lastCompletedTaskId: task.id,
                      completedTaskIds: [...prevCompleted, task.id],
                      tasks: safeTasks.map((t) =>
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
