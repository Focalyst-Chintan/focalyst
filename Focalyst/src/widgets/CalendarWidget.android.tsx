import { Column, Row, Text } from '@expo/ui/jetpack-compose';
import { background, clip, fillMaxSize, fillMaxWidth, paddingAll, Shapes } from '@expo/ui/jetpack-compose/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { CalendarEventItem, CalendarWidgetProps, WidgetEnv } from './types';

const CalendarWidget = (props: CalendarWidgetProps, env?: WidgetEnv) => {
  'widget';
  const scheme = env?.colorScheme ?? props.systemScheme ?? 'dark';
  const isDark = scheme === 'dark';
  const preset = props.preset ?? 'white';

  const cornerRadius = (r: number) => clip(Shapes.RoundedCorner(r));

  const getPalette = () => {
    if (preset === 'white' || (preset === 'monochrome' && !isDark)) {
      return {
        bg: '#FFFFFF',
        weekdayColor: '#FF3B30',
        dayNumberColor: '#090A0F',
        primaryCardBg: '#FFE9E7',
        primaryTitleColor: '#6E140E',
        primaryTimeColor: '#C8281E',
        secondaryCardBg: '#F3F4F6',
        secondaryTitleColor: '#3C3C43',
        secondaryTimeColor: '#8E8E93',
        emptyText: '#8E8E93',
      };
    }
    const map: Record<string, any> = {
      monochrome: { bg: '#090A0F', weekdayColor: '#FF453A', dayNumberColor: '#FFFFFF', primaryCardBg: '#1C1F2B', primaryTitleColor: '#FFFFFF', primaryTimeColor: '#94A3B8', secondaryCardBg: '#141720', secondaryTitleColor: '#E2E8F0', secondaryTimeColor: '#64748B', emptyText: '#64748B' },
      ember: { bg: '#160804', weekdayColor: '#FF6B2B', dayNumberColor: '#FFFFFF', primaryCardBg: '#3D150A', primaryTitleColor: '#FFEDD5', primaryTimeColor: '#FDBA74', secondaryCardBg: '#260E07', secondaryTitleColor: '#FED7AA', secondaryTimeColor: '#FB923C', emptyText: '#FDBA74' },
      cobalt: { bg: '#060D1F', weekdayColor: '#60A5FA', dayNumberColor: '#FFFFFF', primaryCardBg: '#132E6E', primaryTitleColor: '#FFFFFF', primaryTimeColor: '#93C5FD', secondaryCardBg: '#0C1D47', secondaryTitleColor: '#E0F2FE', secondaryTimeColor: '#60A5FA', emptyText: '#93C5FD' },
      emerald: { bg: '#05140F', weekdayColor: '#34D399', dayNumberColor: '#FFFFFF', primaryCardBg: '#0F4230', primaryTitleColor: '#FFFFFF', primaryTimeColor: '#6EE7B7', secondaryCardBg: '#09291E', secondaryTitleColor: '#D1FAE5', secondaryTimeColor: '#6EE7B7', emptyText: '#6EE7B7' },
      violet: { bg: '#0C061C', weekdayColor: '#A78BFA', dayNumberColor: '#FFFFFF', primaryCardBg: '#31176B', primaryTitleColor: '#FFFFFF', primaryTimeColor: '#C4B5FD', secondaryCardBg: '#1E0E42', secondaryTitleColor: '#EDE9FE', secondaryTimeColor: '#C4B5FD', emptyText: '#C4B5FD' },
      crimson: { bg: '#190509', weekdayColor: '#FB7185', dayNumberColor: '#FFFFFF', primaryCardBg: '#54111D', primaryTitleColor: '#FFFFFF', primaryTimeColor: '#FDA4AF', secondaryCardBg: '#330A12', secondaryTitleColor: '#FFE4E6', secondaryTimeColor: '#FDA4AF', emptyText: '#FDA4AF' },
      amber: { bg: '#170F04', weekdayColor: '#FBBF24', dayNumberColor: '#FFFFFF', primaryCardBg: '#4F310A', primaryTitleColor: '#FFFFFF', primaryTimeColor: '#FDE68A', secondaryCardBg: '#2E1C06', secondaryTitleColor: '#FEF3C7', secondaryTimeColor: '#FDE68A', emptyText: '#FDE68A' },
    };
    return map[preset] ?? map.cobalt;
  };

  const p = getPalette();
  const safeEvents = Array.isArray(props.events)
    ? props.events.filter((e) => !e.completed)
    : [];
  const visibleEvents = safeEvents.slice(0, 2);

  return (
    <Column modifiers={[fillMaxSize(), background(p.bg), cornerRadius(18), paddingAll(12)]}>
      <Text color={p.weekdayColor} style={{ fontSize: 10, fontWeight: 'bold' }}>
        {(props.weekdayLabel || 'WEDNESDAY').toUpperCase()}
      </Text>
      <Text color={p.dayNumberColor} style={{ fontSize: 28, fontWeight: 'bold' }}>
        {props.dayNumber || '28'}
      </Text>

      {visibleEvents.length === 0 ? (
        <Text color={p.emptyText} style={{ fontSize: 12 }}>
          No events today
        </Text>
      ) : (
        visibleEvents.map((ev, idx) => {
          const isFirst = idx === 0;
          const barColor =
            ev.accentColor && ev.accentColor.trim().length > 0
              ? ev.accentColor
              : isFirst
              ? '#3B82F6'
              : '#EF4444';
          return (
            <Row
              key={ev.id || `ev-${idx}`}
              modifiers={[
                fillMaxWidth(),
                background(isFirst ? p.primaryCardBg : p.secondaryCardBg),
                cornerRadius(8),
                paddingAll(6),
              ]}
            >
              <Column>
                <Text
                  color={barColor}
                  style={{ fontSize: 12, fontWeight: 'bold' }}
                >
                  {`▎ ${ev.title}`}
                </Text>
                <Text
                  color={isFirst ? p.primaryTimeColor : p.secondaryTimeColor}
                  style={{ fontSize: 10 }}
                >
                  {`   ${ev.timeLabel || 'All-day'}`}
                </Text>
              </Column>
            </Row>
          );
        })
      )}
    </Column>
  );
};

export default safeCreateWidget<CalendarWidgetProps>('CalendarWidget', CalendarWidget, {
  preset: 'white',
  systemScheme: 'dark',
  weekdayLabel: 'WEDNESDAY',
  dayNumber: '28',
  events: [] as CalendarEventItem[],
});
