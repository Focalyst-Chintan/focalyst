import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { haptics } from './haptics';
import { GUTTER, useOnboardingTheme } from './theme';
import { ProChip } from './PlanCard';

// Screen 26: React Native mock-ups that copy the real widgets' default look
// (src/widgets: dark container, white text, 60% secondary text, white pill buttons).
// Built only from the answers; nothing is saved.

const W = {
  bg: '#14161D',
  text: '#FFFFFF',
  secondary: 'rgba(255,255,255,0.6)',
  pill: 'rgba(255,255,255,0.10)',
  button: '#FFFFFF',
  buttonText: '#090A0F',
  accent: '#3781FC',
};

const PANEL_PAD = 14;
const GAP = 12;

export interface WidgetPreviewData {
  focusLabel: string;
  habit?: { name: string; icon: string };
  tasks: string[];
  countdown?: { name: string; days: number; pending: boolean };
}

function Tick({ on, size = 22 }: { on: boolean; size?: number }) {
  return on ? (
    <View style={[styles.tick, { width: size, height: size, borderRadius: size / 2, backgroundColor: W.accent }]}>
      <Check size={size * 0.6} color="#FFFFFF" strokeWidth={3} />
    </View>
  ) : (
    <View style={[styles.tick, { width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: W.secondary }]} />
  );
}

function useTick(): [boolean, () => void] {
  const [on, setOn] = useState(false);
  return [
    on,
    () => {
      if (!on) haptics.success();
      else haptics.selection();
      setOn(!on);
    },
  ];
}

function FocusWidget({ size, label }: { size: number; label: string }) {
  const [started, toggle] = useTick();
  return (
    <View style={[styles.widget, { width: size, height: size }]}>
      <Text style={styles.caption}>Focus</Text>
      <Text style={styles.big}>25:00</Text>
      <Text style={styles.caption} numberOfLines={1}>
        {label}
      </Text>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={started ? 'Started, preview only' : 'Start, preview only'}
        style={[styles.button, started && { backgroundColor: W.accent }]}
      >
        {started ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
        <Text style={[styles.buttonText, started && { color: '#FFFFFF' }]}>{started ? 'Started' : 'Start'}</Text>
      </Pressable>
    </View>
  );
}

function HabitWidget({ size, habit }: { size: number; habit: { name: string; icon: string } }) {
  const [done, toggle] = useTick();
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${habit.name}, preview only`}
      style={[styles.widget, { width: size, height: size }]}
    >
      <View style={styles.row}>
        <Text style={styles.emoji}>{habit.icon}</Text>
        <Tick on={done} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {habit.name}
      </Text>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{done ? 'Day 1 done' : 'Day 1'}</Text>
      </View>
    </Pressable>
  );
}

function TodoWidget({ width, tasks }: { width: number; tasks: string[] }) {
  const [done, setDone] = useState<boolean[]>(tasks.map(() => false));
  return (
    <View style={[styles.widget, { width, minHeight: 0, gap: 8 }]}>
      <Text style={styles.caption}>Tomorrow</Text>
      {tasks.map((task, i) => (
        <Pressable
          key={task + i}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done[i] }}
          accessibilityLabel={`${task}, preview only`}
          onPress={() => {
            if (!done[i]) haptics.success();
            setDone((d) => d.map((v, j) => (j === i ? !v : v)));
          }}
          style={styles.taskRow}
        >
          <Tick on={done[i]} size={20} />
          <Text
            style={[styles.task, done[i] && { color: W.secondary, textDecorationLine: 'line-through' }]}
            numberOfLines={1}
          >
            {task}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function CountdownWidget({ size, countdown }: { size: number; countdown: NonNullable<WidgetPreviewData['countdown']> }) {
  return (
    <View style={[styles.widget, { width: size, height: size }]}>
      <View style={styles.row}>
        <Text style={styles.emoji}>⏳</Text>
        {countdown.pending ? <ProChip /> : null}
      </View>
      <Text style={styles.big}>{countdown.days}</Text>
      <Text style={styles.caption}>{countdown.days === 1 ? 'day' : 'days'}</Text>
      <Text style={styles.title} numberOfLines={1}>
        {countdown.name}
      </Text>
    </View>
  );
}

function DateWidget({ size }: { size: number }) {
  const now = new Date();
  return (
    <View style={[styles.widget, { width: size, height: size }]}>
      <Text style={[styles.caption, { color: '#F87171', fontWeight: '700' }]}>
        {now.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase()}
      </Text>
      <Text style={styles.big}>{now.getDate()}</Text>
      <Text style={styles.caption}>{now.toLocaleDateString(undefined, { month: 'long' })}</Text>
      <Text style={styles.title}>Your plan starts here</Text>
    </View>
  );
}

export function WidgetPreview({ data }: { data: WidgetPreviewData }) {
  const t = useOnboardingTheme();
  const { width } = useWindowDimensions();
  const inner = width - GUTTER * 2 - PANEL_PAD * 2;
  const small = Math.floor((inner - GAP) / 2);

  const smalls: React.ReactNode[] = [<FocusWidget key="focus" size={small} label={data.focusLabel} />];
  if (data.habit) smalls.push(<HabitWidget key="habit" size={small} habit={data.habit} />);
  if (data.countdown) smalls.push(<CountdownWidget key="countdown" size={small} countdown={data.countdown} />);
  if (!data.habit && !data.countdown && data.tasks.length === 0) smalls.push(<DateWidget key="date" size={small} />);

  return (
    <LinearGradient
      colors={t.dark ? ['#1B2A6B', '#3B1E5E', '#0E1430'] : ['#9DB8FF', '#C7B2F2', '#E8EEFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.panel}
    >
      <View style={styles.previewChip}>
        <Text style={styles.previewText}>Preview</Text>
      </View>
      <View style={styles.grid}>
        {smalls}
        {data.tasks.length > 0 ? <TodoWidget width={inner} tasks={data.tasks} /> : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 28, padding: PANEL_PAD, paddingTop: 40 },
  previewChip: {
    position: 'absolute',
    top: 12,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 20,
    justifyContent: 'center',
  },
  previewText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  widget: { backgroundColor: W.bg, borderRadius: 22, padding: 14, justifyContent: 'space-between' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caption: { color: W.secondary, fontSize: 12, fontWeight: '600' },
  big: { color: W.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  title: { color: W.text, fontSize: 14, fontWeight: '600' },
  emoji: { fontSize: 22 },
  pill: { alignSelf: 'flex-start', backgroundColor: W.pill, borderRadius: 10, paddingHorizontal: 8, height: 22, justifyContent: 'center' },
  pillText: { color: W.text, fontSize: 12, fontWeight: '600' },
  button: {
    backgroundColor: W.button,
    borderRadius: 14,
    height: 28,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: W.buttonText, fontSize: 13, fontWeight: '700' },
  tick: { alignItems: 'center', justifyContent: 'center' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  task: { color: W.text, fontSize: 15, flex: 1 },
});
