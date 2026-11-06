import { HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  clipShape,
  containerBackground,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  kerning,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { CalendarEventItem, CalendarWidgetProps, WidgetEnv } from './types';

const CalendarWidget = (rawProps: CalendarWidgetProps, env?: WidgetEnv) => {
  'widget';
  const props = {
    weekdayLabel: 'SUNDAY',
    dayNumber: '1',
    events: [
      { id: 'sample-1', title: 'Work meeting', timeLabel: '09:00 - 10:45', accentColor: '#3B82F6' },
      { id: 'sample-2', title: 'Review', timeLabel: '7:00 PM - 8:50 PM', accentColor: '#EF4444' },
    ] as CalendarEventItem[],
    upcomingEvents: [] as CalendarEventItem[],
    ...(rawProps as Partial<CalendarWidgetProps>),
  };
  const preset = props.preset ?? 'cobalt';
  const isDark = (env?.colorScheme ?? props.systemScheme ?? 'dark') === 'dark';
  const isMedium = env?.widgetFamily === 'systemMedium';
  const mode = env?.widgetRenderingMode;
  const isAccented = mode === 'accented' || mode === 'vibrant';
  const rgba = (rgb: string, a: number) => `rgba(${rgb}, ${a})`;

  const makePalette = () => {
    const W = '255, 255, 255';
    if (isAccented) {
      return {
        weekday: rgba(W, 0.6),
        dayNum: '#FFFFFF',
        dayNumWeight: 'light' as const,
        text: '#FFFFFF',
        secondary: rgba(W, 0.6),
        empty: rgba(W, 0.4),
        dateHeader: rgba(W, 0.5),
        pillBg: (_c: string) => rgba(W, 0.14),
        pillText: (_c: string) => '#FFFFFF',
        badgeBg: (_c: string) => '#FFFFFF',
        barColor: (_c: string) => '#FFFFFF',
      };
    }
    if (preset === 'white' || (preset === 'monochrome' && !isDark)) {
      return {
        weekday: '#FF3B30',
        dayNum: '#1C1C1E',
        dayNumWeight: 'light' as const,
        text: '#1C1C1E',
        secondary: '#8E8E93',
        empty: '#8E8E93',
        dateHeader: '#8E8E93',
        pillBg: (c: string) => rgba(hexToRgb(c), 0.16),
        pillText: (c: string) => darkenHex(c),
        badgeBg: (c: string) => c,
        barColor: (c: string) => c,
      };
    }
    if (preset === 'monochrome' && isDark) {
      return {
        weekday: '#FF453A',
        dayNum: '#FFFFFF',
        dayNumWeight: 'light' as const,
        text: '#FFFFFF',
        secondary: rgba(W, 0.6),
        empty: rgba(W, 0.35),
        dateHeader: rgba(W, 0.5),
        pillBg: (c: string) => rgba(hexToRgb(c), 0.22),
        pillText: (c: string) => lightenHex(c),
        badgeBg: (c: string) => c,
        barColor: (c: string) => c,
      };
    }
    // Themed presets: use theme weekday color, dark bg, but Apple-style layout
    const themes: Record<string, { weekday: string; secondary: string }> = {
      ember: { weekday: '#FDBA74', secondary: '#FDBA74' },
      cobalt: { weekday: '#93C5FD', secondary: '#93C5FD' },
      emerald: { weekday: '#6EE7B7', secondary: '#6EE7B7' },
      violet: { weekday: '#C4B5FD', secondary: '#C4B5FD' },
      crimson: { weekday: '#FDA4AF', secondary: '#FDA4AF' },
      amber: { weekday: '#FDE68A', secondary: '#FDE68A' },
    };
    const t = themes[preset] ?? themes.cobalt;
    return {
      weekday: t.weekday,
      dayNum: '#FFFFFF',
      dayNumWeight: 'light' as const,
      text: '#FFFFFF',
      secondary: t.secondary,
      empty: t.secondary,
      dateHeader: t.secondary,
      pillBg: (c: string) => rgba(hexToRgb(c), 0.22),
      pillText: (c: string) => lightenHex(c),
      badgeBg: (c: string) => c,
      barColor: (c: string) => c,
    };
  };

  const hexToRgb = (hex: string): string => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return '59, 130, 246';
    return `${r}, ${g}, ${b}`;
  };

  const darkenHex = (hex: string): string => {
    const h = hex.replace('#', '');
    const r = Math.max(0, Math.round(parseInt(h.substring(0, 2), 16) * 0.6));
    const g = Math.max(0, Math.round(parseInt(h.substring(2, 4), 16) * 0.6));
    const b = Math.max(0, Math.round(parseInt(h.substring(4, 6), 16) * 0.6));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const lightenHex = (hex: string): string => {
    const h = hex.replace('#', '');
    const r = Math.min(255, Math.round(parseInt(h.substring(0, 2), 16) * 1.3 + 40));
    const g = Math.min(255, Math.round(parseInt(h.substring(2, 4), 16) * 1.3 + 40));
    const b = Math.min(255, Math.round(parseInt(h.substring(4, 6), 16) * 1.3 + 40));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const p = makePalette();
  const accentable: any[] = isAccented ? [{ $type: 'widgetAccentable', accentable: true }] : [];
  const safeEvents = Array.isArray(props.events)
    ? props.events.filter((e) => e && typeof e === 'object' && !e.completed)
    : [];
  const rawUpcoming = Array.isArray(props.upcomingEvents)
    ? props.upcomingEvents.filter((e) => e && typeof e === 'object' && !e.completed)
    : [];

  // Apple-style event pill with circular calendar icon badge
  const renderEventPill = (ev: CalendarEventItem, idx: number, maxTitleChars: number, showTime?: boolean) => {
    const color = ev.accentColor && ev.accentColor.trim().length > 0 ? ev.accentColor : '#3B82F6';
    const title = `${ev.title ?? ''}`;
    const cleanTitle = title.length > maxTitleChars ? `${title.slice(0, maxTitleChars)}…` : title;
    const bg = isAccented ? p.pillBg(color) : p.pillBg(color);
    const titleColor = isAccented ? '#FFFFFF' : p.pillText(color);

    return (
      <HStack
        key={ev.id || `ev-${idx}`}
        modifiers={[
          padding({ horizontal: 8, vertical: 4 }),
          background(bg),
          cornerRadius(9),
        ]}
      >
        {/* Circular calendar icon badge */}
        <ZStack modifiers={[frame({ width: 18, height: 18 })]}>
          <VStack modifiers={[frame({ width: 18, height: 18 }), background(isAccented ? '#FFFFFF' : p.badgeBg(color)), clipShape('circle'), ...accentable]}>
            <Spacer />
          </VStack>
          <Image systemName="calendar" size={9} color="#FFFFFF" modifiers={[font({ size: 9, weight: 'bold' })]} />
        </ZStack>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(titleColor), padding({ leading: 5 })]}>
          {cleanTitle}
        </Text>
        <Spacer />
        {showTime && ev.timeLabel && ev.timeLabel !== 'All-day' ? (
          <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(p.secondary)]}>
            {ev.timeLabel.split('-')[0].trim()}
          </Text>
        ) : null}
      </HStack>
    );
  };

  // MEDIUM: Apple's 2-column layout
  if (isMedium) {
    const leftEvents = safeEvents.slice(0, 2);
    const overflowToday = safeEvents.slice(2).map((e) => ({ ...e, dateHeader: 'LATER TODAY' }));
    const rightEvents = [...overflowToday, ...rawUpcoming].slice(0, 3);

    return (
      <HStack modifiers={[padding({ all: 14 }), containerBackground(isAccented ? rgba('255,255,255', 0.01) : 'transparent', 'widget')]}>
        {/* LEFT COLUMN: Date + Today's Events */}
        <VStack modifiers={[frame({ width: 140 }), padding({ trailing: 6 })]}>
          <VStack modifiers={[padding({ leading: 2 })]}>
            <HStack>
              <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(p.weekday), kerning(0.6), ...accentable]}>
                {(props.weekdayLabel || 'SUNDAY').toUpperCase()}
              </Text>
              <Spacer />
            </HStack>
            <HStack modifiers={[padding({ top: -2 })]}>
              <Text modifiers={[font({ size: 44, weight: p.dayNumWeight }), foregroundStyle(p.dayNum)]}>
                {props.dayNumber || '1'}
              </Text>
              <Spacer />
            </HStack>
          </VStack>

          <Spacer />

          {leftEvents.length === 0 ? (
            <HStack modifiers={[padding({ leading: 2, bottom: 4 })]}>
              <Text modifiers={[font({ size: 15, weight: 'regular' }), foregroundStyle(p.empty)]}>
                No Events Today
              </Text>
              <Spacer />
            </HStack>
          ) : (
            <VStack>
              {leftEvents.map((ev, idx) => renderEventPill(ev, idx, 13, false))}
            </VStack>
          )}
        </VStack>

        {/* RIGHT COLUMN: Upcoming Events grouped by date */}
        <VStack modifiers={[padding({ leading: 8 })]}>
          {rightEvents.length === 0 ? (
            <VStack>
              <Spacer />
              <HStack>
                <Text modifiers={[font({ size: 14, weight: 'regular' }), foregroundStyle(p.empty)]}>
                  No Upcoming Events
                </Text>
                <Spacer />
              </HStack>
              <Spacer />
            </VStack>
          ) : (
            <VStack>
              {rightEvents.map((ev, idx) => {
                const prevHeader = idx > 0 ? rightEvents[idx - 1]?.dateHeader : null;
                const currentHeader = (ev.dateHeader || 'UPCOMING').toUpperCase();
                const showHeader = currentHeader !== prevHeader;
                return (
                  <VStack key={ev.id || `right-ev-${idx}`} modifiers={[padding({ bottom: 2 })]}>
                    {showHeader ? (
                      <HStack modifiers={[padding({ top: idx === 0 ? 0 : 4, bottom: 3 })]}>
                        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(p.dateHeader)]}>
                          {currentHeader}
                        </Text>
                        <Spacer />
                      </HStack>
                    ) : null}
                    {renderEventPill(ev, idx, 16, true)}
                  </VStack>
                );
              })}
              <Spacer />
            </VStack>
          )}
        </VStack>
      </HStack>
    );
  }

  // SMALL: Apple Calendar style square
  const visibleEvents = safeEvents.slice(0, 2);

  return (
    <VStack modifiers={[padding({ all: 12 }), containerBackground(isAccented ? rgba('255,255,255', 0.01) : 'transparent', 'widget')]}>
      <VStack modifiers={[padding({ leading: 2 })]}>
        <HStack>
          <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(p.weekday), kerning(0.6), ...accentable]}>
            {(props.weekdayLabel || 'SUNDAY').toUpperCase()}
          </Text>
          <Spacer />
        </HStack>
        <HStack modifiers={[padding({ top: -2 })]}>
          <Text modifiers={[font({ size: 44, weight: p.dayNumWeight }), foregroundStyle(p.dayNum)]}>
            {props.dayNumber || '1'}
          </Text>
          <Spacer />
        </HStack>
      </VStack>

      <Spacer />

      {visibleEvents.length === 0 ? (
        <HStack modifiers={[padding({ leading: 2, bottom: 6 })]}>
          <Text modifiers={[font({ size: 15, weight: 'regular' }), foregroundStyle(p.empty)]}>
            No events today
          </Text>
          <Spacer />
        </HStack>
      ) : (
        <VStack>
          {visibleEvents.map((ev, idx) => renderEventPill(ev, idx, 12, false))}
        </VStack>
      )}
    </VStack>
  );
};

export default safeCreateWidget<CalendarWidgetProps>('CalendarWidget', CalendarWidget, {
  preset: 'cobalt',
  systemScheme: 'dark',
  weekdayLabel: 'SUNDAY',
  dayNumber: '1',
  events: [] as CalendarEventItem[],
  upcomingEvents: [] as CalendarEventItem[],
});
