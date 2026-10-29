import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { CalendarEventItem, CalendarWidgetProps, WidgetEnv } from './types';

const CalendarWidget = (props: CalendarWidgetProps, env?: WidgetEnv) => {
  'widget';
  const scheme = env?.colorScheme ?? props.systemScheme ?? 'dark';
  const isDark = scheme === 'dark';
  const preset = props.preset ?? 'cobalt';
  const isMedium = env?.widgetFamily === 'systemMedium';

  const getPalette = () => {
    if (preset === 'white' || (preset === 'monochrome' && !isDark)) {
      return {
        bg: '#FFFFFF',
        weekdayColor: '#FF3B30',
        dayNumberColor: '#090A0F',
        primaryCardBg: '#F1F5F9',
        primaryBarColor: '#3B82F6',
        primaryTitleColor: '#0F172A',
        primaryTimeColor: '#475569',
        secondaryCardBg: '#F8FAFC',
        secondaryBarColor: '#EF4444',
        secondaryTitleColor: '#1E293B',
        secondaryTimeColor: '#64748B',
        emptyText: '#8E8E93',
      };
    }
    if (preset === 'monochrome' && isDark) {
      return {
        bg: '#090A0F',
        weekdayColor: '#94A3B8',
        dayNumberColor: '#FFFFFF',
        primaryCardBg: '#181B24',
        primaryBarColor: '#3B82F6',
        primaryTitleColor: '#FFFFFF',
        primaryTimeColor: '#94A3B8',
        secondaryCardBg: '#12151E',
        secondaryBarColor: '#EF4444',
        secondaryTitleColor: '#E2E8F0',
        secondaryTimeColor: '#64748B',
        emptyText: '#64748B',
      };
    }
    const map: Record<string, any> = {
      ember: {
        bg: '#160804',
        weekdayColor: '#FDBA74',
        dayNumberColor: '#FFFFFF',
        primaryCardBg: '#3D150A',
        primaryBarColor: '#FF5500',
        primaryTitleColor: '#FFFFFF',
        primaryTimeColor: '#FDBA74',
        secondaryCardBg: '#260E07',
        secondaryBarColor: '#3B82F6',
        secondaryTitleColor: '#FFEDD5',
        secondaryTimeColor: '#FB923C',
        emptyText: '#FDBA74',
      },
      cobalt: {
        bg: '#060D1F',
        weekdayColor: '#93C5FD',
        dayNumberColor: '#FFFFFF',
        primaryCardBg: '#132E6E',
        primaryBarColor: '#3B82F6',
        primaryTitleColor: '#FFFFFF',
        primaryTimeColor: '#93C5FD',
        secondaryCardBg: '#0C1D47',
        secondaryBarColor: '#EF4444',
        secondaryTitleColor: '#E0F2FE',
        secondaryTimeColor: '#93C5FD',
        emptyText: '#93C5FD',
      },
      emerald: {
        bg: '#05140F',
        weekdayColor: '#6EE7B7',
        dayNumberColor: '#FFFFFF',
        primaryCardBg: '#0F4230',
        primaryBarColor: '#10B981',
        primaryTitleColor: '#FFFFFF',
        primaryTimeColor: '#6EE7B7',
        secondaryCardBg: '#09291E',
        secondaryBarColor: '#3B82F6',
        secondaryTitleColor: '#D1FAE5',
        secondaryTimeColor: '#6EE7B7',
        emptyText: '#6EE7B7',
      },
      violet: {
        bg: '#0C061C',
        weekdayColor: '#C4B5FD',
        dayNumberColor: '#FFFFFF',
        primaryCardBg: '#31176B',
        primaryBarColor: '#8B5CF6',
        primaryTitleColor: '#FFFFFF',
        primaryTimeColor: '#C4B5FD',
        secondaryCardBg: '#1E0E42',
        secondaryBarColor: '#3B82F6',
        secondaryTitleColor: '#EDE9FE',
        secondaryTimeColor: '#C4B5FD',
        emptyText: '#C4B5FD',
      },
      crimson: {
        bg: '#190509',
        weekdayColor: '#FDA4AF',
        dayNumberColor: '#FFFFFF',
        primaryCardBg: '#54111D',
        primaryBarColor: '#F43F5E',
        primaryTitleColor: '#FFFFFF',
        primaryTimeColor: '#FDA4AF',
        secondaryCardBg: '#330A12',
        secondaryBarColor: '#3B82F6',
        secondaryTitleColor: '#FFE4E6',
        secondaryTimeColor: '#FDA4AF',
        emptyText: '#FDA4AF',
      },
      amber: {
        bg: '#170F04',
        weekdayColor: '#FDE68A',
        dayNumberColor: '#FFFFFF',
        primaryCardBg: '#4F310A',
        primaryBarColor: '#F59E0B',
        primaryTitleColor: '#FFFFFF',
        primaryTimeColor: '#FDE68A',
        secondaryCardBg: '#2E1C06',
        secondaryBarColor: '#3B82F6',
        secondaryTitleColor: '#FEF3C7',
        secondaryTimeColor: '#FDE68A',
        emptyText: '#FDE68A',
      },
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
    ? {
        bg: '',
        weekdayColor: secondary,
        dayNumberColor: primary,
        primaryCardBg: '#1FFFFFFF',
        primaryBarColor: '#FFFFFFFF',
        primaryTitleColor: primary,
        primaryTimeColor: secondary,
        secondaryCardBg: '#1FFFFFFF',
        secondaryBarColor: '#FFFFFFFF',
        secondaryTitleColor: primary,
        secondaryTimeColor: secondary,
        emptyText: secondary,
      }
    : getPalette();
  const safeEvents = Array.isArray(props.events)
    ? props.events.filter((e) => !e.completed)
    : [];
  const visibleEvents = safeEvents.slice(0, 2);
  const maxChars = isMedium ? 28 : 14;

  return (
    <VStack modifiers={[padding({ all: 12 }), ...(tinted ? [] : [background(p.bg)])]}>
      {/* Flush-Left Weekday + Date Number (Each row has its own HStack + Spacer so "28" never centers under "WEDNESDAY") */}
      <VStack modifiers={[padding({ leading: 2 })]}>
        <HStack>
          <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(p.weekdayColor)]}>
            {(props.weekdayLabel || 'WEDNESDAY').toUpperCase()}
          </Text>
          <Spacer />
        </HStack>
        <HStack modifiers={[padding({ top: -2 })]}>
          <Text modifiers={[font({ size: 32, weight: 'bold' }), foregroundStyle(p.dayNumberColor), ...accent]}>
            {props.dayNumber || '28'}
          </Text>
          <Spacer />
        </HStack>
      </VStack>

      <Spacer />

      {/* Event / Reminder Pill Cards */}
      {visibleEvents.length === 0 ? (
        <HStack modifiers={[padding({ leading: 2, bottom: 8 })]}>
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(p.emptyText)]}>
            No events today
          </Text>
          <Spacer />
        </HStack>
      ) : (
        <VStack>
          {visibleEvents.map((ev, idx) => {
            const isFirst = idx === 0;
            const cardBg = isFirst ? p.primaryCardBg : p.secondaryCardBg;
            // Strictly use the exact color the user picked for this reminder in the app
            const barColor =
              !tinted && ev.accentColor && ev.accentColor.trim().length > 0
                ? ev.accentColor
                : isFirst
                ? p.primaryBarColor
                : p.secondaryBarColor;
            const titleColor = isFirst ? p.primaryTitleColor : p.secondaryTitleColor;
            const timeColor = isFirst ? p.primaryTimeColor : p.secondaryTimeColor;
            const cleanTitle =
              ev.title.length > maxChars ? `${ev.title.slice(0, maxChars)}…` : ev.title;

            return (
              <HStack
                key={ev.id || `ev-${idx}`}
                modifiers={[
                  padding({ horizontal: 7, vertical: 4.5 }),
                  background(cardBg),
                  cornerRadius(8),
                ]}
              >
                {/* Vertical Left Accent Pill Bar */}
                <VStack
                  modifiers={[
                    frame({ width: 3.5, height: 24 }),
                    background(barColor),
                    cornerRadius(2),
                    ...accent,
                  ]}
                >
                  <Spacer />
                </VStack>
                <VStack modifiers={[padding({ leading: 6 })]}>
                  <HStack>
                    <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(titleColor)]}>
                      {cleanTitle}
                    </Text>
                    <Spacer />
                  </HStack>
                  <HStack>
                    <Text modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle(timeColor)]}>
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
