import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import {
  getWidgetPayload,
  setWidgetColorPreset,
  subscribeToWidgetPayload,
  syncAllWidgetsFromApp,
} from '../services/widgetSync';
import type { WidgetColorPreset } from '../widgets/types';

const PRESETS: {
  id: WidgetColorPreset;
  label: string;
  sub: string;
  topGlow: string;
  bg: string;
  accent: string;
}[] = [
  { id: 'white', label: 'Pure White', sub: 'Always Light UI', topGlow: '#E2E8F0', bg: '#F8FAFC', accent: '#090A0F' },
  { id: 'monochrome', label: 'Monochrome', sub: 'Auto Light/Dark', topGlow: '#27272A', bg: '#090A0F', accent: '#FFFFFF' },
  { id: 'ember', label: 'Ember Glow', sub: 'Daylight Orange', topGlow: '#6E220D', bg: '#160804', accent: '#FF5500' },
  { id: 'cobalt', label: 'Cobalt Study', sub: 'Electric Blue', topGlow: '#1A3F99', bg: '#060D1F', accent: '#3B82F6' },
  { id: 'emerald', label: 'Emerald Walk', sub: 'Forest Vitality', topGlow: '#114F3A', bg: '#05140F', accent: '#10B981' },
  { id: 'violet', label: 'Violet Hike', sub: 'Indigo Horizon', topGlow: '#432091', bg: '#0C061C', accent: '#8B5CF6' },
  { id: 'crimson', label: 'Crimson Pulse', sub: 'Workout Ruby', topGlow: '#751728', bg: '#190509', accent: '#F43F5E' },
  { id: 'amber', label: 'Amber Gold', sub: 'Morning Sun', topGlow: '#6B420D', bg: '#170F04', accent: '#F59E0B' },
];

// Theme cards show their own background, so their text must contrast with it (Pure White is light).
const isLightHex = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
};

export const WidgetThemePicker: React.FC = () => {
  const systemScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const [payload, setPayload] = useState(getWidgetPayload());

  useEffect(() => {
    const unsub = subscribeToWidgetPayload(() => setPayload({ ...getWidgetPayload() }));
    return () => {
      unsub();
    };
  }, []);

  const activePreset = PRESETS.find((p) => p.id === payload.preset) ?? PRESETS[0];
  const isLight = payload.preset === 'white' || (payload.preset === 'monochrome' && systemScheme === 'light');

  const cardBg = isLight ? '#F8FAFC' : activePreset.bg;
  const bandBg = isLight ? '#E2E8F0' : activePreset.topGlow;
  const primaryText = isLight ? '#090A0F' : '#FFFFFF';
  const mutedText = isLight ? '#475569' : '#94A3B8';
  const accentColor = isLight ? '#090A0F' : activePreset.accent;

  const toggleTask = (id: string) => {
    const nextTasks = payload.tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    syncAllWidgetsFromApp({ tasks: nextTasks });
  };

  const togglePomodoro = () => {
    syncAllWidgetsFromApp({
      pomodoro: { ...payload.pomodoro, isRunning: !payload.pomodoro.isRunning },
    });
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Widgets & Gradient Themes</Text>
        <Text style={styles.badge}>
          {payload.preset === 'monochrome' ? `MONO (${systemScheme.toUpperCase()})` : payload.preset.toUpperCase()}
        </Text>
      </View>

      {/* Color & Monochrome Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.swatchScroll}>
        {PRESETS.map((item) => {
          const selected = payload.preset === item.id;
          const lightCard = isLightHex(item.bg);
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setWidgetColorPreset(item.id)}
              style={[
                styles.swatchCard,
                { backgroundColor: item.bg, borderColor: selected ? item.accent : '#1E293B' },
              ]}
            >
              <View style={[styles.swatchGlow, { backgroundColor: item.topGlow }]}>
                <View style={[styles.swatchDot, { backgroundColor: item.accent }]} />
              </View>
              <Text style={[styles.swatchTitle, lightCard && { color: '#090A0F' }]}>{item.label}</Text>
              <Text style={[styles.swatchSub, lightCard && { color: '#475569' }]}>{item.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Live Interactive Widget Previews */}
      <View style={styles.previewGrid}>
        {/* 1. Streak Widget */}
        <View style={[styles.widgetBox, { backgroundColor: cardBg }]}>
          <View style={[styles.widgetBand, { backgroundColor: bandBg }]}>
            <Text style={[styles.bandText, { color: primaryText }]}>🔥 {payload.habitName}</Text>
            <Text style={[styles.bandSub, { color: mutedText }]}>{payload.totalDays}d</Text>
          </View>
          <View>
            <Text style={[styles.smallLabel, { color: mutedText }]}>Streak Days</Text>
            <Text style={[styles.bigNumber, { color: primaryText }]}>{payload.streakDays}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { backgroundColor: accentColor, width: '78%' }]} />
          </View>
        </View>

        {/* 2. Heatmap Widget */}
        <View style={[styles.widgetBox, { backgroundColor: cardBg }]}>
          <View style={[styles.widgetBand, { backgroundColor: bandBg }]}>
            <Text style={[styles.bandText, { color: primaryText }]}>Oct 2026</Text>
            <Text style={[styles.bandSub, { color: mutedText }]}>{payload.totalDays}d</Text>
          </View>
          <View style={styles.heatmapGrid}>
            {payload.gridLevels.slice(0, 28).map((lvl, idx) => (
              <View
                key={idx}
                style={[
                  styles.heatCell,
                  {
                    backgroundColor: accentColor,
                    opacity: lvl === 0 ? 0.15 : lvl * 0.25,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* 3. Interactive To-Do Widget */}
        <View style={[styles.widgetBox, { backgroundColor: cardBg }]}>
          <View style={[styles.widgetBand, { backgroundColor: bandBg }]}>
            <Text style={[styles.bandText, { color: primaryText }]}>To-Do List</Text>
            <Text style={[styles.bandText, { color: accentColor }]}>
              {payload.tasks.filter((t) => !t.completed).length}
            </Text>
          </View>
          <View style={{ marginTop: 6 }}>
            {payload.tasks.length === 0 ? (
              <View style={{ paddingVertical: 10 }}>
                <Text style={{ color: mutedText, fontSize: 11, fontWeight: '600' }}>No tasks yet</Text>
                <Text style={{ color: mutedText, fontSize: 9, marginTop: 2 }}>Tap + in app to add</Text>
              </View>
            ) : (
              payload.tasks.slice(0, 3).map((task) => (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => toggleTask(task.id)}
                  style={styles.todoRow}
                >
                  <Text
                    style={[
                      styles.todoText,
                      {
                        color: task.completed ? mutedText : primaryText,
                        textDecorationLine: task.completed ? 'line-through' : 'none',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {task.completed ? '● ' : '○ '} {task.title}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* 4. Day Countdown Widget */}
        <View style={[styles.widgetBox, { backgroundColor: cardBg }]}>
          <View style={[styles.widgetBand, { backgroundColor: bandBg, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={[styles.bandSub, { color: mutedText }]}>{(payload.countdown.title || 'AUDIT').toUpperCase()}</Text>
            <Text style={[styles.bandText, { color: primaryText, fontSize: 13 }]}>{`${Math.max(0, Math.floor(Math.max(0, new Date(payload.countdown.targetDateIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days left`}</Text>
          </View>
          <Text style={[styles.countdownDigits, { color: primaryText }]}>
            {`${String(Math.max(0, Math.floor(Math.max(0, new Date(payload.countdown.targetDateIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))).padStart(2, '0')}D : ${String(Math.floor((Math.max(0, new Date(payload.countdown.targetDateIso).getTime() - Date.now()) / (1000 * 60 * 60)) % 24)).padStart(2, '0')}H : ${String(Math.floor((Math.max(0, new Date(payload.countdown.targetDateIso).getTime() - Date.now()) / (1000 * 60)) % 60)).padStart(2, '0')}M`}
          </Text>
          <Text style={[styles.bandSub, { color: accentColor, alignSelf: 'flex-end' }]}>
            {payload.countdown.dateLabel || '01/12/2026'}
          </Text>
        </View>

        {/* 5. Interactive Pomodoro Widget */}
        <View style={[styles.widgetBox, { backgroundColor: cardBg }]}>
          <View style={[styles.widgetBand, { backgroundColor: bandBg }]}>
            <Text style={[styles.bandText, { color: primaryText }]}>{payload.pomodoro.taskLabel || 'Focus'}</Text>
            <Text style={[styles.bandSub, { color: mutedText }]}>
              {payload.pomodoro.isRunning ? 'ACTIVE' : 'READY'}
            </Text>
          </View>
          <Text style={[styles.bigNumber, { color: primaryText, fontSize: 28 }]}>25:00</Text>
            <TouchableOpacity
              onPress={togglePomodoro}
              style={[styles.pomoPill, { backgroundColor: payload.pomodoro.isRunning ? accentColor : primaryText }]}
            >
              <Text style={[styles.pomoPillText, { color: payload.pomodoro.isRunning ? '#FFFFFF' : cardBg }]}>
                {payload.pomodoro.isRunning ? 'Pause' : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 6. Calendar & Reminders Widget */}
          {(() => {
            const calPalette = (() => {
              if (payload.preset === 'white' || (payload.preset === 'monochrome' && systemScheme === 'light')) {
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
                };
              }
              if (payload.preset === 'monochrome' && systemScheme === 'dark') {
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
                };
              }
              const map: Record<string, any> = {
                ember: { bg: '#160804', weekdayColor: '#FDBA74', dayNumberColor: '#FFFFFF', primaryCardBg: '#3D150A', primaryBarColor: '#FF5500', primaryTitleColor: '#FFFFFF', primaryTimeColor: '#FDBA74', secondaryCardBg: '#260E07', secondaryBarColor: '#3B82F6', secondaryTitleColor: '#FFEDD5', secondaryTimeColor: '#FB923C' },
                cobalt: { bg: '#060D1F', weekdayColor: '#93C5FD', dayNumberColor: '#FFFFFF', primaryCardBg: '#132E6E', primaryBarColor: '#3B82F6', primaryTitleColor: '#FFFFFF', primaryTimeColor: '#93C5FD', secondaryCardBg: '#0C1D47', secondaryBarColor: '#EF4444', secondaryTitleColor: '#E0F2FE', secondaryTimeColor: '#93C5FD' },
                emerald: { bg: '#05140F', weekdayColor: '#6EE7B7', dayNumberColor: '#FFFFFF', primaryCardBg: '#0F4230', primaryBarColor: '#10B981', primaryTitleColor: '#FFFFFF', primaryTimeColor: '#6EE7B7', secondaryCardBg: '#09291E', secondaryBarColor: '#3B82F6', secondaryTitleColor: '#D1FAE5', secondaryTimeColor: '#6EE7B7' },
                violet: { bg: '#0C061C', weekdayColor: '#C4B5FD', dayNumberColor: '#FFFFFF', primaryCardBg: '#31176B', primaryBarColor: '#8B5CF6', primaryTitleColor: '#FFFFFF', primaryTimeColor: '#C4B5FD', secondaryCardBg: '#1E0E42', secondaryBarColor: '#3B82F6', secondaryTitleColor: '#EDE9FE', secondaryTimeColor: '#C4B5FD' },
                crimson: { bg: '#190509', weekdayColor: '#FDA4AF', dayNumberColor: '#FFFFFF', primaryCardBg: '#54111D', primaryBarColor: '#F43F5E', primaryTitleColor: '#FFFFFF', primaryTimeColor: '#FDA4AF', secondaryCardBg: '#330A12', secondaryBarColor: '#3B82F6', secondaryTitleColor: '#FFE4E6', secondaryTimeColor: '#FDA4AF' },
                amber: { bg: '#170F04', weekdayColor: '#FDE68A', dayNumberColor: '#FFFFFF', primaryCardBg: '#4F310A', primaryBarColor: '#F59E0B', primaryTitleColor: '#FFFFFF', primaryTimeColor: '#FDE68A', secondaryCardBg: '#2E1C06', secondaryBarColor: '#3B82F6', secondaryTitleColor: '#FEF3C7', secondaryTimeColor: '#FDE68A' },
              };
              return map[payload.preset] ?? map.cobalt;
            })();

            const previewEvents = (payload.calendarEvents && payload.calendarEvents.length > 0)
              ? payload.calendarEvents.slice(0, 2)
              : [
                  { id: 'p1', title: 'Work Meeting', timeLabel: '09:00 - 10:45', accentColor: '#3B82F6' },
                  { id: 'p2', title: 'Urgent Review', timeLabel: '7:00 PM - 8:50 PM', accentColor: '#EF4444' },
                ];

            return (
              <View style={[styles.widgetBox, { backgroundColor: calPalette.bg }]}>
                <View style={{ alignItems: 'flex-start', paddingLeft: 2 }}>
                  <Text style={[styles.calWeekday, { color: calPalette.weekdayColor }]}>
                    WEDNESDAY
                  </Text>
                  <Text style={[styles.calDayNumber, { color: calPalette.dayNumberColor }]}>
                    28
                  </Text>
                </View>

                <View style={{ marginTop: 'auto', gap: 5 }}>
                  {previewEvents.map((ev, idx) => {
                    const isFirst = idx === 0;
                    const cBg = isFirst ? calPalette.primaryCardBg : calPalette.secondaryCardBg;
                    const barC = ev.accentColor || (isFirst ? calPalette.primaryBarColor : calPalette.secondaryBarColor);
                    const tColor = isFirst ? calPalette.primaryTitleColor : calPalette.secondaryTitleColor;
                    const timeC = isFirst ? calPalette.primaryTimeColor : calPalette.secondaryTimeColor;

                    return (
                      <View
                        key={ev.id || `cal-${idx}`}
                        style={[styles.calCardRow, { backgroundColor: cBg }]}
                      >
                        <View style={[styles.calAccentBar, { backgroundColor: barC }]} />
                        <View style={{ flex: 1, marginLeft: 6 }}>
                          <Text numberOfLines={1} style={[styles.calEventTitle, { color: tColor }]}>
                            {ev.title}
                          </Text>
                          <Text numberOfLines={1} style={[styles.calEventTime, { color: timeC }]}>
                            {ev.timeLabel || 'All-day'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })()}
        </View>
      </View>
    );
  };

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#111625',
    borderRadius: 16,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  badge: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#172554',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  swatchScroll: { marginBottom: 14 },
  swatchCard: {
    width: 112,
    borderRadius: 12,
    padding: 8,
    marginRight: 8,
    borderWidth: 2,
  },
  swatchGlow: {
    height: 28,
    borderRadius: 7,
    marginBottom: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  swatchDot: { width: 9, height: 9, borderRadius: 5 },
  swatchTitle: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  swatchSub: { color: '#94A3B8', fontSize: 9, marginTop: 1 },
  // Two columns; every preview is a small widget, so each takes one square cell.
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  widgetBox: {
    flexGrow: 1,
    flexBasis: '40%',
    aspectRatio: 1,
    borderRadius: 22,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  widgetBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bandText: { fontSize: 12, fontWeight: '700' },
  bandSub: { fontSize: 10, fontWeight: '600' },
  smallLabel: { fontSize: 11, fontWeight: '500' },
  bigNumber: { fontSize: 32, fontWeight: '800' },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(148,163,184,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 4 },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  heatCell: { width: 14, height: 14, borderRadius: 3.5 },
  todoRow: { paddingVertical: 3 },
  todoText: { fontSize: 12, fontWeight: '600' },
  countdownDigits: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  pomoPill: {
    paddingVertical: 7,
    borderRadius: 16,
    alignItems: 'center',
  },
  pomoPillText: { fontSize: 12, fontWeight: '800' },
  calWeekday: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  calDayNumber: { fontSize: 28, fontWeight: '700', marginTop: -2 },
  calCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4.5,
    borderRadius: 7,
  },
  calAccentBar: { width: 3.5, height: 22, borderRadius: 2 },
  calEventTitle: { fontSize: 11, fontWeight: '700' },
  calEventTime: { fontSize: 9, fontWeight: '500', marginTop: 1 },
});

