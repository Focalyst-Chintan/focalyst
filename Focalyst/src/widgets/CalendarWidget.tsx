import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { CalendarEventItem, CalendarWidgetProps, WidgetEnv } from './types';

const CalendarWidget = (rawProps: CalendarWidgetProps, env?: WidgetEnv) => {
  'widget';
  // Gallery and placeholder entries arrive without props: show a realistic sample instead.
  const props = {
    weekdayLabel: 'WEDNESDAY',
    dayNumber: '28',
    events: [
      { id: 'sample-1', title: 'Work meeting', timeLabel: '09:00 - 10:45', accentColor: '#3B82F6' },
      { id: 'sample-2', title: 'Review', timeLabel: '7:00 PM - 8:50 PM', accentColor: '#EF4444' },
    ] as CalendarEventItem[],
    ...(rawProps as Partial<CalendarWidgetProps>),
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
  // barPrimary / barSecondary are only used when an event has no colour of its own.
  const makePalette = () => {
    const WHITE = '255, 255, 255';
    const INK = '11, 11, 15';
    if (isAccented) {
      return {
        text: '#FFFFFF', secondaryText: rgba(WHITE, 0.6), weekday: rgba(WHITE, 0.6), pill: rgba(WHITE, 0.14),
        barPrimary: '#FFFFFF', barSecondary: '#FFFFFF',
      };
    }
    if (preset === 'monochrome') {
      return isDark
        ? {
            text: '#FFFFFF', secondaryText: rgba(WHITE, 0.6), weekday: rgba(WHITE, 0.6), pill: rgba(WHITE, 0.1),
            barPrimary: '#3B82F6', barSecondary: '#EF4444',
          }
        : {
            text: '#0B0B0F', secondaryText: rgba(INK, 0.55), weekday: rgba(INK, 0.55), pill: rgba(INK, 0.06),
            barPrimary: '#3B82F6', barSecondary: '#EF4444',
          };
    }
    if (preset === 'white') {
      return {
        text: '#090A0F', secondaryText: '#475569', weekday: '#FF3B30', pill: rgba('9, 10, 15', 0.06),
        barPrimary: '#3B82F6', barSecondary: '#EF4444',
      };
    }
    const themes: Record<string, { secondaryText: string; barPrimary: string; barSecondary: string }> = {
      ember: { secondaryText: '#FDBA74', barPrimary: '#FF5500', barSecondary: '#3B82F6' },
      cobalt: { secondaryText: '#93C5FD', barPrimary: '#3B82F6', barSecondary: '#EF4444' },
      emerald: { secondaryText: '#6EE7B7', barPrimary: '#10B981', barSecondary: '#3B82F6' },
      violet: { secondaryText: '#C4B5FD', barPrimary: '#8B5CF6', barSecondary: '#3B82F6' },
      crimson: { secondaryText: '#FDA4AF', barPrimary: '#F43F5E', barSecondary: '#3B82F6' },
      amber: { secondaryText: '#FDE68A', barPrimary: '#F59E0B', barSecondary: '#3B82F6' },
    };
    const theme = themes[preset] ?? themes.cobalt;
    return {
      text: '#FFFFFF', secondaryText: theme.secondaryText, weekday: theme.secondaryText, pill: rgba(WHITE, 0.1),
      barPrimary: theme.barPrimary, barSecondary: theme.barSecondary,
    };
  };

  const p = makePalette();
  const accentable: any[] = isAccented ? [{ $type: 'widgetAccentable', accentable: true }] : [];
  const safeEvents = Array.isArray(props.events)
    ? props.events.filter((e) => !e.completed)
    : [];
  const visibleEvents = safeEvents.slice(0, 2);
  const maxChars = isMedium ? 28 : 14;

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      {/* Flush-Left Weekday + Date Number (Each row has its own HStack + Spacer so "28" never centers under "WEDNESDAY") */}
      <VStack modifiers={[padding({ leading: 2 })]}>
        <HStack>
          <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(p.weekday)]}>
            {(props.weekdayLabel || 'WEDNESDAY').toUpperCase()}
          </Text>
          <Spacer />
        </HStack>
        <HStack modifiers={[padding({ top: -2 })]}>
          <Text modifiers={[font({ size: 32, weight: 'bold' }), foregroundStyle(p.text), ...accentable]}>
            {props.dayNumber || '28'}
          </Text>
          <Spacer />
        </HStack>
      </VStack>

      <Spacer />

      {/* Event / Reminder Pill Cards */}
      {visibleEvents.length === 0 ? (
        <HStack modifiers={[padding({ leading: 2, bottom: 8 })]}>
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(p.secondaryText)]}>
            No events today
          </Text>
          <Spacer />
        </HStack>
      ) : (
        <VStack>
          {visibleEvents.map((ev, idx) => {
            const isFirst = idx === 0;
            // Strictly use the exact color the user picked for this reminder in the app
            const barColor =
              !isAccented && ev.accentColor && ev.accentColor.trim().length > 0
                ? ev.accentColor
                : isFirst
                ? p.barPrimary
                : p.barSecondary;
            const cleanTitle =
              ev.title.length > maxChars ? `${ev.title.slice(0, maxChars)}…` : ev.title;

            return (
              <HStack
                key={ev.id || `ev-${idx}`}
                modifiers={[
                  padding({ horizontal: 7, vertical: 4.5 }),
                  background(p.pill),
                  cornerRadius(8),
                ]}
              >
                {/* Vertical Left Accent Pill Bar */}
                <VStack
                  modifiers={[
                    frame({ width: 3.5, height: 24 }),
                    background(barColor),
                    cornerRadius(2),
                    ...accentable,
                  ]}
                >
                  <Spacer />
                </VStack>
                <VStack modifiers={[padding({ leading: 6 })]}>
                  <HStack>
                    <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(p.text)]}>
                      {cleanTitle}
                    </Text>
                    <Spacer />
                  </HStack>
                  <HStack>
                    <Text modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle(p.secondaryText)]}>
                      {ev.timeLabel || 'All-day'}
                    </Text>
                    <Spacer />
                  </HStack>
                </VStack>
              </HStack>
            );
          })}
        </VStack>
      )}
    </VStack>
  );
};

export default safeCreateWidget<CalendarWidgetProps>('CalendarWidget', CalendarWidget, {
  preset: 'cobalt',
  systemScheme: 'dark',
  weekdayLabel: 'WEDNESDAY',
  dayNumber: '28',
  events: [] as CalendarEventItem[],
});
