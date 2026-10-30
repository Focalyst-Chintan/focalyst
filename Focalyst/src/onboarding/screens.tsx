import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Briefcase,
  Camera,
  CloudSun,
  Construction,
  Ellipsis,
  GraduationCap,
  LayoutGrid,
  Library,
  Moon,
  PenTool,
  Rocket,
  School,
  Sparkles,
  Stethoscope,
  Sun,
  Sunrise,
  Sunset,
  Target,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import type { BestFocusTime, LifeStage, OnboardingAnswers, OnboardingReport, ProfileType } from './draft';
import type { StepId } from './steps';
import {
  APP_OPTIONS,
  BEST_TIME_OPTIONS,
  DISTRACTION_OPTIONS,
  DRIFT_OPTIONS,
  LIFE_STAGE_OPTIONS,
  PRIVACY_URL,
  ROLE_OPTIONS,
  SOURCE_OPTIONS,
  TERMS_URL,
  gotItLine,
  studyWord,
} from './copy';
import { StepLayout } from './ui/Shell';
import { GhostButton, GlassCard, IconTile, PrimaryButton } from './ui/primitives';
import { BenefitCards, Chip, Chips, PhoneHoursSlider, SingleChoice, Statement, Subtitle, TextField, Title } from './ui/patterns';
import { FeaturePills } from './ui/FeaturePills';
import { useOnboardingTheme } from './ui/theme';
import { SETUP_SCREENS } from './setupScreens';
import { REPORT_SCREENS } from './reportScreens';
import { SAVE_SCREENS } from './saveScreens';

export interface ScreenProps {
  step: StepId;
  answers: OnboardingAnswers;
  update: (patch: Partial<OnboardingAnswers>) => void;
  goNext: () => void;
  /** Screen 6 greets the user for 600 ms when arriving from screen 5. */
  greet: boolean;
  /** A first name from an existing account, never an email. */
  suggestedName?: string;
  openSignIn: () => void;
  /** Before sign-in everyone counts as free; after sign-in, the existing Pro check. */
  isPro: boolean;
  report: OnboardingReport | null;
  setReport: (report: OnboardingReport) => void;
  /** Keys of count-ups that already ran. */
  countedUp: string[];
  markCountedUp: (key: string) => void;
}

// ─── Chapter 1 · Welcome ───────────────────────────────────────────────────────

const APP_ICON = require('../../assets/images/app-icon.png');

function GlowingIcon() {
  const t = useOnboardingTheme();
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(0.45);
  useEffect(() => {
    if (reduceMotion) return;
    const ease = Easing.inOut(Easing.sin);
    glow.value = withRepeat(withSequence(withTiming(0.8, { duration: 2400, easing: ease }), withTiming(0.45, { duration: 2400, easing: ease })), -1);
  }, [glow, reduceMotion]);
  const glowStyle = useAnimatedStyle(() => ({ shadowOpacity: glow.value }));

  return (
    <Animated.View style={[styles.iconGlow, glowStyle]}>
      <View style={[styles.iconTile, { backgroundColor: t.surface, borderColor: t.surfaceBorder }]}>
        <Image source={APP_ICON} style={styles.icon} accessibilityIgnoresInvertColors />
      </View>
    </Animated.View>
  );
}

function Welcome({ goNext, openSignIn }: ScreenProps) {
  const t = useOnboardingTheme();
  const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});
  return (
    <StepLayout
      footer={
        <>
          <PrimaryButton label="Get started" onPress={goNext} />
          <GhostButton label="I already have an account" onPress={openSignIn} />
          <View style={styles.legal}>
            <Text style={[styles.legalText, { color: t.ink3 }]} onPress={() => open(TERMS_URL)} accessibilityRole="link">
              Terms
            </Text>
            <Text style={[styles.legalText, { color: t.ink3 }]}> · </Text>
            <Text style={[styles.legalText, { color: t.ink3 }]} onPress={() => open(PRIVACY_URL)} accessibilityRole="link">
              Privacy
            </Text>
          </View>
        </>
      }
    >
      <View style={styles.welcome}>
        <View style={styles.welcomeTop}>
          <GlowingIcon />
        </View>
        <View>
          <Text style={[styles.wordmark, { color: t.ink2 }]}>FOCALYST</Text>
          <Text accessibilityRole="header" style={[styles.welcomeTitle, { color: t.ink }]}>
            Own your time.
          </Text>
        </View>
      </View>
    </StepLayout>
  );
}

function OneCalmPlace({ goNext }: ScreenProps) {
  return (
    <StepLayout centered footer={<PrimaryButton label="Continue" onPress={goNext} />}>
      <FeaturePills />
      <View style={{ height: 32 }} />
      <Statement
        title="One calm place for your day."
        line="Tasks, habits, focus and notes, together and in sync with focalyst.online."
      />
    </StepLayout>
  );
}

function HelpsYou({ goNext }: ScreenProps) {
  return (
    <StepLayout centered footer={<PrimaryButton label="Continue" onPress={goNext} />}>
      <Title>Focalyst helps you…</Title>
      <View style={{ height: 24 }} />
      <BenefitCards
        items={[
          { icon: Timer, title: 'Focus deeply', line: 'Timed sessions, with distracting apps paused.' },
          { icon: Users, title: 'Build habits with friends', line: 'Streaks, reminders and groups of up to 5.' },
          { icon: LayoutGrid, title: 'Right on your home screen', line: 'Tick off tasks and start focusing from widgets.' },
          {
            icon: Sparkles,
            title: 'Understand your week',
            line: 'Clear insights, an AI coach, and with Pro, Claude and ChatGPT connected to your plan.',
          },
        ]}
      />
    </StepLayout>
  );
}

// ─── Chapter 2 · About you ─────────────────────────────────────────────────────

function Intro({ goNext }: ScreenProps) {
  return (
    <StepLayout centered footer={<PrimaryButton label="Let's go" onPress={goNext} />}>
      <Statement title="Let's build your plan." line="A few quick questions. About 2 minutes." />
    </StepLayout>
  );
}

function Name({ answers, update, goNext, suggestedName }: ScreenProps) {
  const [value, setValue] = useState(answers.name ?? suggestedName ?? '');
  const valid = value.trim().length > 0;
  const submit = () => {
    if (!valid) return;
    update({ name: value.trim() });
    goNext();
  };
  return (
    <StepLayout footerInline footer={<PrimaryButton label="Continue" onPress={submit} disabled={!valid} />}>
      <Title>What should we call you?</Title>
      <View style={{ height: 24 }} />
      <TextField
        value={value}
        onChangeText={(text) => {
          setValue(text);
          if (text.trim()) update({ name: text.trim() });
        }}
        placeholder="Your first name"
        maxLength={40}
        autoFocus
        autoCapitalize="words"
        autoCorrect={false}
        textContentType="givenName"
        autoComplete="name-given"
        returnKeyType="next"
        onSubmitEditing={submit}
        accessibilityLabel="Your first name"
      />
    </StepLayout>
  );
}

const ROLE_ICONS: Record<ProfileType, LucideIcon> = {
  student: GraduationCap,
  professional: Briefcase,
  freelancer: PenTool,
  creator: Camera,
  entrepreneur: Rocket,
};

function Greeting({ name }: { name: string }) {
  const t = useOnboardingTheme();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(timer);
  }, []);
  return (
    <View style={styles.greetingSlot}>
      {visible ? (
        <Animated.Text
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(250)}
          accessibilityLiveRegion="polite"
          style={[styles.greeting, { color: t.primaryText }]}
        >
          Nice to meet you, {name}.
        </Animated.Text>
      ) : null}
    </View>
  );
}

function Role({ answers, update, goNext, greet }: ScreenProps) {
  return (
    <StepLayout>
      {greet && answers.name ? <Greeting name={answers.name} /> : null}
      <Title>What best describes you?</Title>
      <View style={{ height: 24 }} />
      <SingleChoice
        options={ROLE_OPTIONS.map((o) => ({ ...o, icon: ROLE_ICONS[o.value] }))}
        value={answers.profile_type}
        onSelect={(profile_type) => update({ profile_type })}
        onAdvance={goNext}
      />
    </StepLayout>
  );
}

const LIFE_STAGE_ICONS: Record<LifeStage, LucideIcon> = {
  school_exams: School,
  college: Library,
  competitive_exam: Target,
  degree: Stethoscope,
  other: Ellipsis,
};

function WorkingTowards({ answers, update, goNext }: ScreenProps) {
  return (
    <StepLayout footer={<GhostButton label="Skip" onPress={goNext} />}>
      <Title>What are you working towards?</Title>
      <View style={{ height: 24 }} />
      <SingleChoice
        options={LIFE_STAGE_OPTIONS.map((o) => ({ ...o, icon: LIFE_STAGE_ICONS[o.value] }))}
        value={answers.life_stage}
        onSelect={(life_stage) => update({ life_stage })}
        onAdvance={goNext}
      />
    </StepLayout>
  );
}

function WhereHeard({ answers, update, goNext }: ScreenProps) {
  return (
    <StepLayout footer={<GhostButton label="Skip" onPress={goNext} />}>
      <Title>Where did you hear about Focalyst?</Title>
      <View style={{ height: 24 }} />
      <SingleChoice
        options={SOURCE_OPTIONS}
        value={answers.acquisition_source}
        onSelect={(acquisition_source) => update({ acquisition_source })}
        onAdvance={goNext}
      />
    </StepLayout>
  );
}

// ─── Chapter 3 · Your focus right now ──────────────────────────────────────────

function GetsInTheWay({ answers, update, goNext }: ScreenProps) {
  const value = answers.distractions ?? [];
  return (
    <StepLayout footer={<PrimaryButton label="Continue" onPress={goNext} disabled={value.length === 0} />}>
      <Title>What gets in the way most?</Title>
      <Subtitle>Pick all that apply.</Subtitle>
      <View style={{ height: 24 }} />
      <Chips options={DISTRACTION_OPTIONS} value={value} onChange={(distractions) => update({ distractions })} />
    </StepLayout>
  );
}

function Apps({ answers, update, goNext }: ScreenProps) {
  const value = answers.distracting_apps ?? [];
  return (
    <StepLayout
      footer={
        <>
          <PrimaryButton label="Continue" onPress={goNext} disabled={value.length === 0} />
          <GhostButton
            label="None of these"
            onPress={() => {
              update({ distracting_apps: [] });
              goNext();
            }}
          />
        </>
      }
    >
      <Title>Which apps pull you away?</Title>
      <Subtitle>We'll use this for your report and for blocking.</Subtitle>
      <View style={{ height: 24 }} />
      <Chips options={APP_OPTIONS} value={value} onChange={(distracting_apps) => update({ distracting_apps })} />
    </StepLayout>
  );
}

function PhoneTime({ answers, update, goNext }: ScreenProps) {
  const t = useOnboardingTheme();
  const moved = answers.daily_phone_hours !== undefined;
  return (
    <StepLayout footer={<PrimaryButton label="Continue" onPress={goNext} disabled={!moved} />}>
      <Title>About how long are you on your phone each day?</Title>
      <View style={{ height: 40 }} />
      <PhoneHoursSlider
        value={answers.daily_phone_hours ?? 4}
        moved={moved}
        onChange={(daily_phone_hours) => update({ daily_phone_hours })}
      />
      <Text style={[styles.hint, { color: t.ink3 }]}>Not sure? Settings › Screen Time shows it.</Text>
    </StepLayout>
  );
}

function GotIt({ answers, goNext }: ScreenProps) {
  const reduceMotion = useReducedMotion();
  const chosen = [
    ...(answers.distractions ?? []),
    ...(answers.distracting_apps ?? []).filter((a) => a !== 'Other'),
  ];
  return (
    <StepLayout centered footer={<PrimaryButton label="Continue" onPress={goNext} />}>
      <Statement title={answers.name ? `Got it, ${answers.name}.` : 'Got it.'} line={gotItLine(answers)} />
      {chosen.length > 0 ? (
        <GlassCard style={styles.gathered}>
          {chosen.map((label, i) => (
            <Animated.View
              key={label}
              entering={(reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(360).delay(120 + i * 50))}
            >
              <Chip label={label} selected />
            </Animated.View>
          ))}
        </GlassCard>
      ) : null}
    </StepLayout>
  );
}

function DriftTime({ answers, update, goNext }: ScreenProps) {
  return (
    <StepLayout>
      <Title>How long can you focus before your mind drifts?</Title>
      <View style={{ height: 24 }} />
      <SingleChoice
        options={DRIFT_OPTIONS}
        value={answers.focus_drift_minutes}
        onSelect={(focus_drift_minutes) => update({ focus_drift_minutes })}
        onAdvance={goNext}
      />
    </StepLayout>
  );
}

const BEST_TIME_ICONS: Record<BestFocusTime, LucideIcon> = {
  early_morning: Sunrise,
  morning: Sun,
  afternoon: CloudSun,
  evening: Sunset,
  late_night: Moon,
};

function BestTime({ answers, update, goNext }: ScreenProps) {
  return (
    <StepLayout>
      <Title>When do you {studyWord(answers)} best?</Title>
      <View style={{ height: 24 }} />
      <SingleChoice
        options={BEST_TIME_OPTIONS.map((o) => ({ ...o, icon: BEST_TIME_ICONS[o.value] }))}
        value={answers.best_focus_time}
        onSelect={(best_focus_time) => update({ best_focus_time })}
        onAdvance={goNext}
      />
    </StepLayout>
  );
}

// ─── Screens 31 and 32 arrive in P4 ────────────────────────────────────

function ComingSoon() {
  return (
    <StepLayout centered>
      <View style={styles.soon}>
        <IconTile icon={Construction} size={72} iconSize={32} />
      </View>
      <Statement title="Coming soon." line="Your group and next steps arrive in the next update." />
    </StepLayout>
  );
}

const SCREENS: Partial<Record<StepId, (props: ScreenProps) => React.ReactElement>> = {
  1: Welcome,
  2: OneCalmPlace,
  3: HelpsYou,
  4: Intro,
  5: Name,
  6: Role,
  7: WorkingTowards,
  8: WhereHeard,
  9: GetsInTheWay,
  10: Apps,
  11: PhoneTime,
  12: GotIt,
  13: DriftTime,
  14: BestTime,
  ...SETUP_SCREENS,
  ...REPORT_SCREENS,
  ...SAVE_SCREENS,
};

export function OnboardingScreen(props: ScreenProps) {
  const Screen = SCREENS[props.step] ?? ComingSoon;
  return <Screen {...props} />;
}

const styles = StyleSheet.create({
  welcome: { flex: 1, justifyContent: 'space-between', paddingTop: 16 },
  welcomeTop: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  iconGlow: {
    shadowColor: '#3781FC',
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    borderRadius: 30,
  },
  iconTile: { width: 120, height: 120, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 88, height: 88, borderRadius: 20 },
  wordmark: { fontSize: 13, fontWeight: '600', letterSpacing: 13 * 0.35, marginBottom: 12 },
  welcomeTitle: { fontSize: 44, lineHeight: 48, fontWeight: '700', letterSpacing: -0.8 },
  legal: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  legalText: { fontSize: 12, lineHeight: 18, paddingVertical: 4 },
  greetingSlot: { height: 24, marginBottom: 8, justifyContent: 'center' },
  greeting: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 14, marginTop: 28, textAlign: 'center' },
  gathered: { marginTop: 28, padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  soon: { alignItems: 'center', marginBottom: 24 },
});
