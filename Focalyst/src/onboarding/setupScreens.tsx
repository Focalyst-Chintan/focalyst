import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BellRing, Info, KeyRound, ShieldCheck, User, UserPlus } from 'lucide-react-native';
import type { HabitChoice, OnboardingAnswers } from './draft';
import type { ScreenProps } from './screens';
import {
  CUSTOM_HABIT_ICON,
  CUSTOM_HABIT_OPTION,
  GOAL_OPTIONS,
  GROUPS_LOCATION,
  MAX_HABITS,
  countdownNameFor,
  habitOptions,
  joinWithAnd,
  namedApps,
} from './copy';
import { SHOW_GROUP_PRIVACY_LINE } from './flags';
import {
  FREE_COUNTDOWN_MAX_DAYS,
  dateToTime,
  daysUntil,
  formatTime,
  goalHours,
  hoursLabel,
  reminderSuggestions,
  reminderTimeOf,
  timeToDate,
} from './plan';
import { StepLayout } from './ui/Shell';
import { GhostButton, GlassCard, PrimaryButton } from './ui/primitives';
import { Chip, SingleChoice, Subtitle, TextField, Title } from './ui/patterns';
import { MultiCards, PrimerHeader } from './ui/patterns2';
import { ProChip } from './ui/PlanCard';
import { useOnboardingTheme } from './ui/theme';
import { haptics } from './ui/haptics';
import { scheduleDailyFocusReminder } from '../hooks/useNotifications';
import { requestNotificationPermission } from '../blocking/notifications';
import { useBlocking } from '../blocking/BlockingContext';
import { LEVELS } from '../blocking/levels';

// Chapter 4 · Your setup (screens 15 to 21).

const Gap = ({ h }: { h: number }) => <View style={{ height: h }} />;

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ─── 15. Habits ────────────────────────────────────────────────────────────────

const CUSTOM_KEY = '__custom__';

function keyOf(h: HabitChoice) {
  return h.icon === CUSTOM_HABIT_ICON ? CUSTOM_KEY : h.name;
}

/** Keeps the group's habit pick valid when habits change. */
function withHabits(answers: OnboardingAnswers, habits: HabitChoice[]): Partial<OnboardingAnswers> {
  const group = answers.group;
  if (!group || group.habit_index < habits.length) return { habits };
  return { habits, group: { ...group, habit_index: 0 } };
}

function Habits({ answers, update, goNext }: ScreenProps) {
  const t = useOnboardingTheme();
  const habits = answers.habits ?? [];
  const options = habitOptions(answers);
  const custom = habits.find((h) => h.icon === CUSTOM_HABIT_ICON);
  const [customName, setCustomName] = useState(custom?.name ?? '');

  const toggle = (key: string) => {
    const on = habits.some((h) => keyOf(h) === key);
    if (on) return update(withHabits(answers, habits.filter((h) => keyOf(h) !== key)));
    const added: HabitChoice =
      key === CUSTOM_KEY ? { name: customName.trim(), icon: CUSTOM_HABIT_ICON } : options.find((o) => o.name === key)!;
    update(withHabits(answers, [...habits, added]));
  };

  const valid = habits.length > 0 && habits.every((h) => h.name.trim().length > 0);

  return (
    <StepLayout
      footer={
        <>
          <PrimaryButton label="Continue" onPress={goNext} disabled={!valid} />
          <GhostButton
            label="Skip"
            onPress={() => {
              update({ habits: [] });
              goNext();
            }}
          />
        </>
      }
    >
      <Title>Pick up to 2 habits to start.</Title>
      <Subtitle>Small and daily works best. You can add more later.</Subtitle>
      <Gap h={24} />
      <MultiCards
        options={[
          ...options.map((o) => ({ key: o.name, emoji: o.icon, title: o.name })),
          { key: CUSTOM_KEY, emoji: CUSTOM_HABIT_OPTION, title: 'Something else' },
        ]}
        selected={habits.map(keyOf)}
        max={MAX_HABITS}
        onToggle={toggle}
        renderExtra={(key) =>
          key === CUSTOM_KEY ? (
            <View style={styles.extra}>
              <TextField
                value={customName}
                onChangeText={(text) => {
                  setCustomName(text);
                  update({
                    habits: habits.map((h) => (h.icon === CUSTOM_HABIT_ICON ? { ...h, name: text.trim() } : h)),
                  });
                }}
                placeholder="Your habit"
                maxLength={40}
                autoFocus={!customName}
                autoCapitalize="sentences"
                returnKeyType="done"
                accessibilityLabel="Your habit"
                style={styles.smallField}
              />
            </View>
          ) : null
        }
      />
      {habits.length === 0 ? null : (
        <Text style={[styles.counter, { color: t.ink3 }]}>{`${habits.length} of ${MAX_HABITS} picked`}</Text>
      )}
    </StepLayout>
  );
}

// ─── 16. Habit group ───────────────────────────────────────────────────────────

/** Exactly what the existing join form accepts (components/plan/HabitGroupModals.tsx). */
const cleanGroupCode = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

function MiniLeaderboard({ name, habit }: { name: string; habit?: HabitChoice }) {
  const t = useOnboardingTheme();
  return (
    <GlassCard style={styles.board}>
      <View style={styles.boardRow}>
        <Text style={[styles.rank, { color: t.primaryText }]}>1</Text>
        <Text style={[styles.boardName, { color: t.ink }]} numberOfLines={1}>
          {name ? `${name} (you)` : 'You'}
        </Text>
        {habit ? <Text style={styles.boardEmoji}>{habit.icon}</Text> : null}
        <Text style={[styles.boardDay, { color: t.ink2 }]}>Day 1</Text>
      </View>
      {[2, 3, 4, 5].map((n) => (
        <View key={n} style={[styles.boardRow, styles.dashed, { borderColor: t.surfaceBorder }]}>
          <Text style={[styles.rank, { color: t.ink3 }]}>{n}</Text>
          <UserPlus size={16} color={t.ink3} />
          <Text style={[styles.boardInvite, { color: t.ink3 }]}>Invite a friend</Text>
        </View>
      ))}
    </GlassCard>
  );
}

function HabitPills({
  habits,
  index,
  onChange,
}: {
  habits: HabitChoice[];
  index: number;
  onChange: (i: number) => void;
}) {
  const t = useOnboardingTheme();
  return (
    <View>
      <Text style={[styles.followLabel, { color: t.ink2 }]}>Which habit?</Text>
      <View style={styles.pills}>
        {habits.map((h, i) => (
          <Chip
            key={h.name + i}
            label={`${h.icon} ${h.name}`}
            selected={i === index}
            onPress={() => {
              haptics.selection();
              onChange(i);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function HabitGroup({ answers, update, goNext }: ScreenProps) {
  const t = useOnboardingTheme();
  const habits = answers.habits ?? [];
  const group = answers.group;
  const index = Math.min(group?.habit_index ?? 0, Math.max(0, habits.length - 1));
  const code = group?.code ?? '';

  const set = (patch: Partial<NonNullable<OnboardingAnswers['group']>>) =>
    update({ group: { mode: group?.mode ?? 'none', habit_index: index, ...(code ? { code } : {}), ...patch } });

  const valid = !!group && (group.mode !== 'join' || code.length === 6);
  const savedLine = <Text style={[styles.followNote, { color: t.ink3 }]}>We'll set this up as soon as your plan is saved.</Text>;

  return (
    <StepLayout footer={<PrimaryButton label="Continue" onPress={goNext} disabled={!valid} />}>
      <Title>Stay consistent together.</Title>
      <Subtitle>Track a habit with up to 4 friends and see each other's streaks.</Subtitle>
      <Gap h={20} />
      <MiniLeaderboard name={answers.name ?? ''} habit={habits[index]} />
      <Gap h={20} />
      <SingleChoice
        options={[
          { value: 'create' as const, icon: UserPlus, title: 'Start a group', line: "You'll get a code to share." },
          { value: 'join' as const, icon: KeyRound, title: "Join a friend's group", line: 'Use their invite code.' },
          {
            value: 'none' as const,
            icon: User,
            title: 'Just me for now',
            line: `You can join a group later from ${GROUPS_LOCATION}.`,
          },
        ]}
        value={group?.mode}
        onSelect={(mode) => set({ mode, code: mode === 'join' ? code : undefined })}
        renderExtra={(mode) =>
          mode === 'none' ? null : (
            <>
              {habits.length > 1 ? (
                <HabitPills habits={habits} index={index} onChange={(habit_index) => set({ habit_index })} />
              ) : null}
              {mode === 'join' ? (
                <TextField
                  value={code}
                  onChangeText={(text) => set({ code: cleanGroupCode(text) })}
                  placeholder="------"
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="off"
                  accessibilityLabel="Invite code"
                  style={styles.codeField}
                />
              ) : null}
              {savedLine}
            </>
          )
        }
      />
      {SHOW_GROUP_PRIVACY_LINE ? (
        <Text style={[styles.privacy, { color: t.ink3 }]}>
          Group members see your name and this habit's streak and total days. Nothing else.
        </Text>
      ) : null}
    </StepLayout>
  );
}

// ─── 17. Countdown ─────────────────────────────────────────────────────────────

function Countdown({ answers, update, goNext, isPro }: ScreenProps) {
  const t = useOnboardingTheme();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + 10);
  const defaultDate = new Date(today);
  defaultDate.setDate(defaultDate.getDate() + 14);

  const [name, setName] = useState(answers.countdown?.name ?? countdownNameFor(answers));
  const [date, setDate] = useState(answers.countdown?.date ?? isoDate(defaultDate));
  const [androidPicker, setAndroidPicker] = useState(false);

  const days = daysUntil(date);
  const beyondFree = !isPro && days > FREE_COUNTDOWN_MAX_DAYS;
  const valid = name.trim().length > 0;

  const save = (nextName: string, nextDate: string) => {
    if (nextName.trim()) update({ countdown: { name: nextName.trim(), date: nextDate, icon: '⏳' } });
  };

  const onDate = (d?: Date) => {
    setAndroidPicker(false);
    if (!d) return;
    const iso = isoDate(d);
    setDate(iso);
    save(name, iso);
  };

  return (
    <StepLayout
      footerInline
      footer={
        <>
          <PrimaryButton
            label="Continue"
            disabled={!valid}
            onPress={() => {
              save(name, date);
              goNext();
            }}
          />
          <GhostButton
            label="Skip"
            onPress={() => {
              update({ countdown: undefined });
              goNext();
            }}
          />
        </>
      }
    >
      <Title>Anything you're counting down to?</Title>
      <Subtitle>An exam, a launch, a trip.</Subtitle>
      <Gap h={24} />
      <TextField
        value={name}
        onChangeText={(text) => {
          setName(text);
          save(text, date);
        }}
        placeholder="What's it called?"
        maxLength={40}
        autoCapitalize="sentences"
        returnKeyType="done"
        accessibilityLabel="Countdown name"
      />
      <Gap h={12} />
      <GlassCard style={styles.pickerCard}>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={fromIso(date)}
            mode="date"
            display="inline"
            minimumDate={today}
            maximumDate={maxDate}
            accentColor="#3781FC"
            themeVariant={t.dark ? 'dark' : 'light'}
            onChange={(_, d) => onDate(d)}
          />
        ) : (
          <>
            <Pressable onPress={() => setAndroidPicker(true)} accessibilityRole="button" style={styles.androidDate}>
              <Text style={[styles.androidDateText, { color: t.ink }]}>
                {fromIso(date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </Pressable>
            {androidPicker ? (
              <DateTimePicker
                value={fromIso(date)}
                mode="date"
                minimumDate={today}
                maximumDate={maxDate}
                onChange={(_, d) => onDate(d)}
              />
            ) : null}
          </>
        )}
      </GlassCard>
      <Text style={[styles.daysAway, { color: t.ink2 }]}>
        {days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'} away`}
      </Text>
      {beyondFree ? (
        <View style={[styles.infoChip, { backgroundColor: t.surfaceStrong, borderColor: t.surfaceBorder }]}>
          <Info size={16} color={t.primaryText} />
          <Text style={[styles.infoText, { color: t.ink2 }]}>
            Free countdowns can be up to 30 days away. This one will be saved and switched on with Pro.
          </Text>
        </View>
      ) : null}
    </StepLayout>
  );
}

// ─── 18. Tomorrow ──────────────────────────────────────────────────────────────

function Tomorrow({ answers, update, goNext }: ScreenProps) {
  const [fields, setFields] = useState<string[]>(() => {
    const saved = answers.tasks ?? [];
    return [saved[0] ?? '', saved[1] ?? '', saved[2] ?? ''];
  });
  const placeholder = answers.profile_type === 'student' ? 'Revise chapter 4' : 'Finish the proposal';
  const tasks = fields.map((f) => f.trim()).filter(Boolean);

  const change = (i: number, text: string) => {
    const next = fields.map((f, j) => (j === i ? text : f));
    setFields(next);
    update({ tasks: next.map((f) => f.trim()).filter(Boolean) });
  };

  return (
    <StepLayout
      footerInline
      footer={
        <>
          <PrimaryButton label="Continue" onPress={goNext} disabled={tasks.length === 0} />
          <GhostButton
            label="Skip"
            onPress={() => {
              update({ tasks: [] });
              goNext();
            }}
          />
        </>
      }
    >
      <Title>What's one thing you'll get done tomorrow?</Title>
      <Subtitle>Add up to 3. We'll put them on your plan.</Subtitle>
      <Gap h={24} />
      <View style={styles.taskFields}>
        {fields.map((value, i) =>
          i === 0 || fields[i - 1].trim() ? (
            <TextField
              key={i}
              value={value}
              onChangeText={(text) => change(i, text)}
              placeholder={i === 0 ? placeholder : 'Add another'}
              maxLength={80}
              autoFocus={i === 0 && !value}
              autoCapitalize="sentences"
              returnKeyType={i < 2 ? 'next' : 'done'}
              accessibilityLabel={`Task ${i + 1}`}
            />
          ) : null,
        )}
      </View>
    </StepLayout>
  );
}

// ─── 19. Daily goal ────────────────────────────────────────────────────────────

function DailyGoal({ answers, update, goNext }: ScreenProps) {
  const t = useOnboardingTheme();
  const chosen = answers.daily_focus_goal_minutes;
  return (
    <StepLayout>
      <Title>How many hours a day do you want to focus?</Title>
      <Gap h={24} />
      <SingleChoice
        options={GOAL_OPTIONS}
        value={chosen}
        onSelect={(daily_focus_goal_minutes) => update({ daily_focus_goal_minutes })}
        onAdvance={goNext}
      />
      <Text style={[styles.weekLine, { color: chosen ? t.ink2 : 'transparent' }]}>
        {`That's ${goalHours(answers) * 7} hours a week.`}
      </Text>
    </StepLayout>
  );
}

// ─── 20. Reminder and notifications ────────────────────────────────────────────

function Reminder({ answers, update, goNext }: ScreenProps) {
  const t = useOnboardingTheme();
  const [phase, setPhase] = useState<'time' | 'primer'>('time');
  const [busy, setBusy] = useState(false);
  const time = reminderTimeOf(answers);
  const chips = reminderSuggestions(answers.best_focus_time);

  // Save the suggested time straight away, so the draft always holds the shown value.
  useEffect(() => {
    if (!answers.reminder_time) update({ reminder_time: time });
  }, []);

  const turnOn = async () => {
    setBusy(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        const [hour, minute] = time.split(':').map(Number);
        const G = goalHours(answers);
        await scheduleDailyFocusReminder({
          hour,
          minute,
          title: answers.name ? `Time to focus, ${answers.name}.` : 'Time to focus.',
          body: `Today's goal: ${hoursLabel(G)}.`,
        });
      }
      update({ notifications_allowed: granted });
      goNext();
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'primer') {
    return (
      <StepLayout
        centered
        footer={
          <>
            <PrimaryButton label={busy ? 'Turning on…' : 'Turn on'} onPress={turnOn} disabled={busy} />
            <GhostButton
              label="Not now"
              onPress={() => {
                update({ notifications_allowed: false });
                goNext();
              }}
            />
          </>
        }
      >
        <PrimerHeader
          icon={BellRing}
          title="Turn on reminders?"
          lines={[
            `A nudge at ${formatTime(time)} to start focusing`,
            'Habit check-ins that keep streaks alive',
            'No spam. Change it any time.',
          ]}
        />
      </StepLayout>
    );
  }

  return (
    <StepLayout footer={<PrimaryButton label="Continue" onPress={() => setPhase('primer')} />}>
      <Title>When should we nudge you?</Title>
      <Gap h={24} />
      <View style={styles.pills}>
        {chips.map((chip) => (
          <Chip
            key={chip}
            label={formatTime(chip)}
            selected={chip === time}
            onPress={() => {
              haptics.selection();
              update({ reminder_time: chip });
            }}
          />
        ))}
      </View>
      <Gap h={16} />
      <GlassCard style={styles.pickerCard}>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={timeToDate(time)}
            mode="time"
            display="spinner"
            minuteInterval={5}
            themeVariant={t.dark ? 'dark' : 'light'}
            textColor={t.ink}
            onChange={(_, d) => d && update({ reminder_time: dateToTime(d) })}
            style={styles.timeSpinner}
          />
        ) : (
          <Text style={[styles.androidDateText, { color: t.ink }]}>{formatTime(time)}</Text>
        )}
      </GlassCard>
    </StepLayout>
  );
}

// ─── 21. Blocking (gentle mode is free) ────────────────────────────────────────

function Blocking({ answers, update, goNext }: ScreenProps) {
  const t = useOnboardingTheme();
  const blocking = useBlocking();
  // The setup functions read React state, so the latest context is read through a ref after each await.
  const latest = useRef(blocking);
  latest.current = blocking;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const apps = namedApps(answers);
  const appsText = apps.length > 0 ? joinWithAnd(apps) : 'distracting apps';
  const strong = `${LEVELS.firm.label} and ${LEVELS.locked.label}`;

  // The existing setup: Screen Time permission, then the app picker, with Gentle selected.
  const setUp = async () => {
    setBusy(true);
    setNote(null);
    try {
      latest.current.beginSetup();
      latest.current.updateDraft({ level: 'gentle' });
      const status =
        latest.current.permissionStatus === 'approved' ? 'approved' : await latest.current.requestPermission();
      if (status !== 'approved') {
        update({ blocking_set_up: false });
        setNote('Screen Time access is off. You can turn it on later from the Focus tab.');
        return;
      }
      const picked = await latest.current.pickApps('blocklist');
      if (!picked.ok) {
        setNote(picked.reason);
        return;
      }
      // Let the picker's selection and the Gentle draft land before finishing.
      await new Promise((resolve) => setTimeout(resolve, 50));
      const s = latest.current.config.blocklistSummary;
      if (s.appCount + s.categoryCount + s.webCount === 0) {
        update({ blocking_set_up: false });
        setNote('No apps picked yet. You can pick them later from the Focus tab.');
        return;
      }
      latest.current.finishSetup();
      haptics.success();
      update({ blocking_set_up: true });
      goNext();
    } finally {
      setBusy(false);
    }
  };

  return (
    <StepLayout
      centered
      footer={
        <>
          {Platform.OS === 'ios' ? (
            <PrimaryButton label={busy ? 'Setting up…' : 'Set up blocking'} onPress={setUp} disabled={busy} />
          ) : null}
          <GhostButton
            label="Set up later"
            onPress={() => {
              if (answers.blocking_set_up === undefined) update({ blocking_set_up: false });
              goNext();
            }}
          />
        </>
      }
    >
      <PrimerHeader
        icon={ShieldCheck}
        title="Block distractions while you focus."
        lines={[
          `During focus sessions, ${appsText} get a calm pause screen.`,
          `${LEVELS.gentle.label} mode is free.`,
          <View key="strong" style={styles.proLine}>
            <Text style={[styles.primerLike, { color: t.ink2, flexShrink: 1 }]}>
              {`${strong} modes for when you need a hard stop.`}
            </Text>
            <ProChip />
          </View>,
        ]}
      />
      {note ? <Text style={[styles.note, { color: t.ink2 }]}>{note}</Text> : null}
    </StepLayout>
  );
}

export const SETUP_SCREENS = {
  15: Habits,
  16: HabitGroup,
  17: Countdown,
  18: Tomorrow,
  19: DailyGoal,
  20: Reminder,
  21: Blocking,
} as const;

const styles = StyleSheet.create({
  extra: { paddingTop: 10 },
  smallField: { height: 52, fontSize: 17 },
  counter: { fontSize: 14, marginTop: 4 },
  board: { padding: 12, gap: 8, borderRadius: 20 },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 36, paddingHorizontal: 8, borderRadius: 12 },
  dashed: { borderWidth: 1, borderStyle: 'dashed' },
  rank: { width: 16, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  boardName: { flex: 1, fontSize: 15, fontWeight: '600' },
  boardEmoji: { fontSize: 16 },
  boardDay: { fontSize: 14, fontWeight: '500' },
  boardInvite: { fontSize: 14 },
  followLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  followNote: { fontSize: 13 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  codeField: { letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  privacy: { fontSize: 12, marginTop: 16 },
  pickerCard: { padding: 8, borderRadius: 20, overflow: 'hidden', alignItems: 'center' },
  daysAway: { fontSize: 14, marginTop: 10 },
  infoChip: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 12 },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  androidDate: { height: 52, justifyContent: 'center', alignSelf: 'stretch', paddingHorizontal: 12 },
  androidDateText: { fontSize: 18, fontWeight: '600', padding: 12 },
  taskFields: { gap: 12 },
  weekLine: { fontSize: 15, marginTop: 16 },
  timeSpinner: { alignSelf: 'stretch' },
  proLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  primerLike: { fontSize: 16, lineHeight: 22 },
  note: { fontSize: 14, textAlign: 'center', marginTop: 20 },
});
