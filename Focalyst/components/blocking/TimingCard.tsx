import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { DAY_LETTERS, formatDays, formatSpan } from '../../src/blocking/schedules';
import { haptics } from '../../src/blocking/haptics';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** "09:00 AM" */
const clock = (minutes: number) => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const toDate = (minutes: number) => {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
};

export const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

type Row = 'start' | 'end' | 'repeat' | null;

type Props = {
  /** Minutes after midnight, or null for "Now" (quick block). */
  startMin: number | null;
  endMin: number;
  /** Monday first. All false = "Never". */
  days: boolean[];
  onStartChange: (minutes: number | null) => void;
  onEndChange: (minutes: number) => void;
  onDaysChange: (days: boolean[]) => void;
  /** Offer "Now" as the start (quick block). */
  allowNow?: boolean;
};

/** Start at / End at / Repeat rows, each expanding an inline wheel or the day selector. */
export function TimingCard({ startMin, endMin, days, onStartChange, onEndChange, onDaysChange, allowNow }: Props) {
  const { c, isDark } = useBlockingTheme();
  const [open, setOpen] = useState<Row>(null);
  const toggle = (row: Row) => setOpen((cur) => (cur === row ? null : row));

  const card = isDark ? '#131829' : c.surface;
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : c.border;
  const divider = isDark ? 'rgba(255,255,255,0.06)' : c.border;
  const label = isDark ? '#FFFFFF' : c.textPrimary;

  const effectiveStart = startMin ?? nowMinutes();

  const picker = (value: number, onChange: (m: number) => void) => (
    <DateTimePicker
      value={toDate(value)}
      mode="time"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      themeVariant={isDark ? 'dark' : 'light'}
      textColor={isDark ? '#FFFFFF' : c.textPrimary}
      onValueChange={(_, d) => {
        if (Platform.OS !== 'ios') setOpen(null);
        if (d) {
          haptics.selection();
          onChange(d.getHours() * 60 + d.getMinutes());
        }
      }}
      onDismiss={() => setOpen(null)}
      style={styles.wheel}
    />
  );

  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: cardBorder }]}>
      <Pressable onPress={() => toggle('start')} accessibilityRole="button" style={styles.row}>
        <Text style={[styles.label, { color: label }]}>Start at</Text>
        <View style={[styles.valuePill, { backgroundColor: c.accentTint }]}>
          <Text style={[styles.value, { color: c.accent }]}>{startMin == null ? 'Now' : clock(startMin)}</Text>
        </View>
      </Pressable>
      {open === 'start' && (
        <View>
          {picker(effectiveStart, (m) => onStartChange(m))}
          {allowNow && startMin != null && (
            <Pressable
              onPress={() => {
                onStartChange(null);
                setOpen(null);
              }}
              style={styles.nowLink}
              accessibilityRole="button"
            >
              <Text style={[styles.value, { color: c.accent }]}>Start now instead</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: divider }]} />
      <Pressable onPress={() => toggle('end')} accessibilityRole="button" style={styles.row}>
        <Text style={[styles.label, { color: label }]}>End at</Text>
        <View style={styles.endValue}>
          <View style={[styles.badge, { borderColor: divider }]}>
            <Text style={[type.caption, type.tabular, { color: c.textSecondary }]}>{formatSpan(effectiveStart, endMin)}</Text>
          </View>
          <View style={[styles.valuePill, { backgroundColor: c.accentTint }]}>
            <Text style={[styles.value, { color: c.accent }]}>{clock(endMin)}</Text>
          </View>
        </View>
      </Pressable>
      {open === 'end' && picker(endMin, onEndChange)}

      <View style={[styles.divider, { backgroundColor: divider }]} />
      <Pressable onPress={() => toggle('repeat')} accessibilityRole="button" style={styles.row}>
        <Text style={[styles.label, { color: label }]}>Repeat</Text>
        <Text style={[type.secondary, { color: c.textSecondary }]}>{formatDays(days)}</Text>
      </Pressable>
      {open === 'repeat' && (
        <View style={styles.days}>
          {DAY_LETTERS.map((letter, i) => {
            const on = days[i];
            return (
              <Pressable
                key={i}
                onPress={() => {
                  haptics.selection();
                  onDaysChange(days.map((d, j) => (j === i ? !d : d)));
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={DAY_NAMES[i]}
                style={[
                  styles.day,
                  on ? { backgroundColor: c.selectedFill } : { borderWidth: 1, borderColor: divider },
                ]}
              >
                <Text style={[styles.dayLabel, { color: on ? c.onSelected : c.textSecondary }]}>{letter}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  valuePill: { height: 32, borderRadius: 16, paddingHorizontal: 12, justifyContent: 'center' },
  value: { fontSize: 15, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  endValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { height: 24, borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, justifyContent: 'center' },
  divider: { height: 1, marginHorizontal: 16 },
  wheel: { alignSelf: 'stretch', height: 180 },
  nowLink: { alignItems: 'center', paddingBottom: 12, minHeight: 44, justifyContent: 'center' },
  days: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
});
