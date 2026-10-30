import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BellRing,
  CalendarClock,
  Hourglass,
  ListChecks,
  Repeat,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sun,
  Target,
  Timer,
  Users,
} from 'lucide-react-native';
import type { ScreenProps } from './screens';
import { BEST_TIME_OPTIONS, namedApps, studyWord } from './copy';
import {
  buildFocusPlan,
  countdownPending,
  daysUntil,
  formatTime,
  goalHours,
  hoursLabel,
  reminderTimeOf,
  rhythmLabel,
  saveRecommendedPreset,
} from './plan';
import { computeOnboardingReport, formatNumber, reclaimLabel } from './report';
import { StepLayout } from './ui/Shell';
import { GlassCard, GradientText, PrimaryButton } from './ui/primitives';
import { Chip, Statement, Subtitle, Title } from './ui/patterns';
import { LoaderChecklist, Overline, StatTile, TrendChart, useCountUp } from './ui/patterns2';
import { PlanCard, type PlanRow } from './ui/PlanCard';
import { WidgetPreview } from './ui/WidgetPreview';
import { haptics } from './ui/haptics';
import { useOnboardingTheme } from './ui/theme';

// Chapter 5 · Your report (screens 22 to 26).

const Gap = ({ h }: { h: number }) => <View style={{ height: h }} />;

const LOADER_LINES = [
  'Reading your answers',
  'Setting your focus rhythm',
  'Preparing your habits and reminders',
  'Planning your first week',
];
const LOADER_STEP_MS = 700;
const LOADER_CAP_MS = 3500;

/** Count-ups run once: the countedUp flag in the draft stops replays on back and forward. */
function useCountedUpOnce(key: string, countedUp: string[], markCountedUp: (key: string) => void): boolean {
  const run = useRef(!countedUp.includes(key)).current;
  useEffect(() => {
    if (run) markCountedUp(key);
  }, [key, markCountedUp, run]);
  return run;
}

// ─── 22. Building your plan ────────────────────────────────────────────────────

function Building({ answers, setReport, goNext }: ScreenProps) {
  useEffect(() => {
    // The real work happens during the loader.
    const report = computeOnboardingReport(answers);
    setReport(report);
    saveRecommendedPreset(report.preset);
    const done = setTimeout(goNext, Math.min(LOADER_CAP_MS, LOADER_LINES.length * LOADER_STEP_MS + 200));
    return () => clearTimeout(done);
    // Runs once when the loader appears.
  }, []);

  return (
    <StepLayout centered>
      <Statement title="Building your plan…" />
      <Gap h={32} />
      <LoaderChecklist lines={LOADER_LINES} stepMs={LOADER_STEP_MS} />
    </StepLayout>
  );
}

// ─── 23. Where your time goes ──────────────────────────────────────────────────

function TimeGoes({ answers, report: saved, countedUp, markCountedUp, goNext }: ScreenProps) {
  const t = useOnboardingTheme();
  const report = useMemo(() => saved ?? computeOnboardingReport(answers), [answers, saved]);
  const run = useCountedUpOnce('23', countedUp, markCountedUp);
  const hero = useCountUp(report.yearlyPhoneHours, 900, run);
  const days = useCountUp(report.wakingDays, 450, run);
  const apps = namedApps(answers);
  const healthy = report.H < 2;
  const finalHero = `${formatNumber(report.yearlyPhoneHours)} hours`;

  return (
    <StepLayout centered footer={<PrimaryButton label="Continue" onPress={goNext} />}>
      <Overline centered>WHERE YOUR TIME GOES</Overline>
      <View style={styles.heroWrap}>
        <GradientText text={`${formatNumber(Math.round(hero))} hours`} sizeText={finalHero} fontSize={48} />
      </View>
      <Text style={[styles.heroCaption, { color: t.ink2 }]}>on your phone this year</Text>
      <Text style={[styles.support, { color: t.ink }]}>
        {healthy
          ? 'A healthy base to build on.'
          : `That's about ${formatNumber(Math.round(days))} waking days.`}
      </Text>
      <Gap h={24} />
      <View style={styles.tiles}>
        <StatTile value={`${formatNumber(report.H)} h`} label="a day" />
        <StatTile value={`${formatNumber(report.weeklyHours)} h`} label="a week" />
      </View>
      {apps.length > 0 ? (
        <View style={styles.mostlyOn}>
          <Text style={[styles.mostlyLabel, { color: t.ink2 }]}>Mostly on</Text>
          {apps.slice(0, 4).map((app) => (
            <Chip key={app} label={app} selected={false} />
          ))}
        </View>
      ) : null}
      <Text style={[styles.footnote, { color: t.ink3 }]}>
        {`Estimate from your answers: ${formatNumber(report.H)} hours a day, 365 days, 16 waking hours a day.`}
      </Text>
    </StepLayout>
  );
}

// ─── 24. What's possible ───────────────────────────────────────────────────────

function Possible({ answers, report: saved, countedUp, markCountedUp, goNext }: ScreenProps) {
  const t = useOnboardingTheme();
  const report = useMemo(() => saved ?? computeOnboardingReport(answers), [answers, saved]);
  const run = useCountedUpOnce('24', countedUp, markCountedUp);
  const hours = useCountUp(report.reclaimHoursYear, 900, run);
  const weeks = useCountUp(report.reclaimWeeks, 450, run);
  const G = report.G;
  const study = studyWord(answers);

  return (
    <StepLayout footer={<PrimaryButton label="Continue" onPress={goNext} />}>
      <Overline>WHAT'S POSSIBLE</Overline>
      <Title>Here's what your plan can give you.</Title>
      <Subtitle>{`Turn just ${reclaimLabel(report)} of scrolling into focus each day and that's:`}</Subtitle>
      <Gap h={16} />
      <View style={styles.tiles}>
        <View style={styles.heroStat}>
          <GradientText
            text={formatNumber(Math.round(hours))}
            sizeText={formatNumber(report.reclaimHoursYear)}
            fontSize={40}
          />
          <Text style={[styles.heroStatLabel, { color: t.ink2 }]}>hours a year</Text>
        </View>
        <View style={styles.heroStat}>
          <GradientText text={formatNumber(Math.round(weeks))} sizeText={formatNumber(report.reclaimWeeks)} fontSize={40} />
          <Text style={[styles.heroStatLabel, { color: t.ink2 }]}>{`weeks of full-time ${study}`}</Text>
        </View>
      </View>
      <Gap h={20} />
      <GlassCard style={styles.chartCard}>
        <Text style={[styles.chartTitle, { color: t.ink }]}>Your plan for the next 12 weeks</Text>
        <TrendChart
          values={report.weekly}
          highlightIndex={5}
          highlightLabel={`${formatNumber(G * 7)} h a week`}
          animate={run}
        />
      </GlassCard>
      <Text style={[styles.support, styles.left, { color: t.ink }]}>
        {`Up to ${formatNumber(report.total12)} focused hours in 12 weeks, if you follow your plan.`}
      </Text>
      <Text style={[styles.footnote, styles.left, { color: t.ink3 }]}>
        {`Based on your goal of ${hoursLabel(G)} a day, building up over 6 weeks.`}
      </Text>
    </StepLayout>
  );
}

// ─── 25. Your plan ─────────────────────────────────────────────────────────────

function planRows(props: ScreenProps): { rows: PlanRow[]; note: string } {
  const { answers, isPro } = props;
  const plan = buildFocusPlan(answers, isPro);
  const best = BEST_TIME_OPTIONS.find((o) => o.value === answers.best_focus_time);
  const countdown = answers.countdown;
  const pending = countdownPending(answers, isPro);
  const group = answers.group;
  const hasHabits = (answers.habits?.length ?? 0) > 0;

  const rows: PlanRow[] = [
    { icon: Timer, label: 'Focus rhythm', value: rhythmLabel(plan.effective), pro: plan.proLocked },
    { icon: Target, label: 'Daily goal', value: `${hoursLabel(goalHours(answers))} a day` },
    { icon: Sun, label: 'Best time', value: best?.title ?? '' },
    { icon: BellRing, label: 'Reminder', value: formatTime(reminderTimeOf(answers)) },
    { icon: ShieldAlert, label: 'What gets in the way', value: answers.distractions ?? [] },
    { icon: Smartphone, label: 'Apps to pause', value: namedApps(answers) },
    { icon: Repeat, label: 'Habits', value: (answers.habits ?? []).map((h) => `${h.icon} ${h.name}`) },
    {
      icon: Users,
      label: 'Habit group',
      value:
        hasHabits && group?.mode === 'create'
          ? 'Starting a group'
          : hasHabits && group?.mode === 'join'
            ? 'Joining a group'
            : '',
    },
    {
      icon: Hourglass,
      label: 'Countdown',
      value: countdown ? `${countdown.name} · ${daysUntil(countdown.date)} days` : '',
      pro: pending,
    },
    { icon: ListChecks, label: 'Tomorrow', value: answers.tasks ?? [] },
    { icon: ShieldCheck, label: 'Blocking', value: answers.blocking_set_up ? 'Gentle mode' : '' },
  ];
  return { rows, note: plan.note };
}

function YourPlan(props: ScreenProps) {
  const t = useOnboardingTheme();
  const { rows, note } = planRows(props);
  useEffect(() => {
    haptics.success();
  }, []);
  return (
    <StepLayout footer={<PrimaryButton label="Continue" onPress={props.goNext} />}>
      <Title>Your Focalyst plan.</Title>
      <Gap h={24} />
      <PlanCard rows={rows} />
      <View style={[styles.noteRow, { backgroundColor: t.surfaceStrong }]}>
        <CalendarClock size={16} color={t.primaryText} />
        <Text style={[styles.noteText, { color: t.ink2 }]}>{note}</Text>
      </View>
    </StepLayout>
  );
}

// ─── 26. On your home screen ───────────────────────────────────────────────────

function HomeScreen({ answers, isPro, goNext }: ScreenProps) {
  const t = useOnboardingTheme();
  const plan = buildFocusPlan(answers, isPro);
  const countdown = answers.countdown;
  return (
    <StepLayout footer={<PrimaryButton label="Save my plan" onPress={goNext} />}>
      <Title>Your plan, one glance away.</Title>
      <Subtitle>
        Interactive widgets let you tick off tasks, log a habit and start a focus session without opening the app.
      </Subtitle>
      <Gap h={20} />
      <Text style={[styles.tryLine, { color: t.primaryText }]}>Try tapping them</Text>
      <WidgetPreview
        data={{
          focusLabel: `Session 1 of ${plan.effective.rounds}`,
          habit: answers.habits?.[0],
          tasks: answers.tasks ?? [],
          countdown: countdown
            ? { name: countdown.name, days: Math.max(0, daysUntil(countdown.date)), pending: countdownPending(answers, isPro) }
            : undefined,
        }}
      />
      <Text style={[styles.footnote, styles.left, { color: t.ink3 }]}>
        Preview with your plan. You can add widgets once your plan is saved.
      </Text>
    </StepLayout>
  );
}

export const REPORT_SCREENS = {
  22: Building,
  23: TimeGoes,
  24: Possible,
  25: YourPlan,
  26: HomeScreen,
} as const;

const styles = StyleSheet.create({
  heroWrap: { alignItems: 'center', marginTop: 4 },
  heroCaption: { fontSize: 16, textAlign: 'center', marginTop: 2 },
  support: { fontSize: 17, lineHeight: 24, textAlign: 'center', marginTop: 16, fontWeight: '500' },
  left: { textAlign: 'left' },
  tiles: { flexDirection: 'row', gap: 12 },
  mostlyOn: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  mostlyLabel: { fontSize: 14, fontWeight: '600' },
  footnote: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 20 },
  heroStat: { flex: 1 },
  heroStatLabel: { fontSize: 14, marginTop: 2 },
  chartCard: { padding: 16, borderRadius: 20, gap: 8 },
  chartTitle: { fontSize: 16, fontWeight: '600' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, marginTop: 12 },
  noteText: { flex: 1, fontSize: 14, lineHeight: 20 },
  tryLine: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
});
