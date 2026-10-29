// Copy, options and formatters for the web onboarding (WEB_ONBOARDING_DESIGN.md 4 and 5).
import {
  Briefcase, Camera, GraduationCap, LayoutGrid, PenTool, Rocket, Sparkles, Timer, Users,
} from 'lucide-react';
import type {
  AcquisitionSource, BestFocusTime, DriftMinutes, LifeStage, ProfileType,
} from '@/lib/onboarding/draft';
import type { ChoiceOption } from './patterns';

export const ROLE_LABELS: Record<ProfileType, string> = {
  student: 'Student',
  professional: 'Professional',
  freelancer: 'Freelancer',
  creator: 'Creator',
  entrepreneur: 'Entrepreneur',
};

export const ROLE_OPTIONS: ChoiceOption<ProfileType>[] = [
  { value: 'student', label: 'Student', line: 'School, college or exam prep', icon: GraduationCap },
  { value: 'professional', label: 'Professional', line: 'A job with goals and deadlines', icon: Briefcase },
  { value: 'freelancer', label: 'Freelancer', line: 'Your own clients and schedule', icon: PenTool },
  { value: 'creator', label: 'Creator', line: 'Content, art or a channel', icon: Camera },
  { value: 'entrepreneur', label: 'Entrepreneur', line: 'Building something of your own', icon: Rocket },
];

export const LIFE_STAGE_OPTIONS: ChoiceOption<LifeStage>[] = [
  { value: 'school_exams', label: 'School exams' },
  { value: 'college', label: 'College semesters' },
  { value: 'competitive_exam', label: 'A competitive exam, like NEET, JEE or UPSC' },
  { value: 'degree', label: 'A medical or professional degree' },
  { value: 'other', label: 'Something else' },
];

/** Short values for the plan panel. */
export const LIFE_STAGE_SHORT: Record<LifeStage, string> = {
  school_exams: 'School exams',
  college: 'College semesters',
  competitive_exam: 'Competitive exam',
  degree: 'Medical or professional degree',
  other: 'Something else',
};

export const SOURCE_OPTIONS: ChoiceOption<AcquisitionSource>[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'friend', label: 'A friend' },
  { value: 'app_store', label: 'App Store or Play Store' },
  { value: 'google', label: 'Google' },
  { value: 'other', label: 'Somewhere else' },
];

export const DISTRACTIONS = [
  'Phone scrolling', 'Social media', 'Procrastination', 'Too many tasks',
  'Low energy', 'Overthinking', 'Noise around me', 'Not knowing where to start',
];

export const APPS = [
  'Instagram', 'YouTube', 'WhatsApp', 'Snapchat', 'Reels and Shorts', 'Games',
  'Netflix', 'X', 'Reddit', 'Facebook', 'Other',
];

// Value strings are numbers stored as DriftMinutes.
export const DRIFT_OPTIONS: ChoiceOption<DriftMinutes>[] = [
  { value: 10, label: 'About 10 minutes' },
  { value: 25, label: 'About 25 minutes' },
  { value: 45, label: 'About 45 minutes' },
  { value: 60, label: 'An hour or more' },
];

export const BEST_TIME_OPTIONS: ChoiceOption<BestFocusTime>[] = [
  { value: 'early_morning', label: 'Early morning', line: 'Before 8 am' },
  { value: 'morning', label: 'Morning', line: '8 am to noon' },
  { value: 'afternoon', label: 'Afternoon', line: 'Noon to 5 pm' },
  { value: 'evening', label: 'Evening', line: '5 pm to 9 pm' },
  { value: 'late_night', label: 'Late night', line: 'After 9 pm' },
];

export const BENEFITS = [
  { icon: Timer, title: 'Focus deeply', line: 'Timed sessions that keep you on one thing.' },
  { icon: Users, title: 'Build habits with friends', line: 'Streaks, reminders and groups of up to 5.' },
  { icon: LayoutGrid, title: 'Right on your home screen', line: 'Widgets on the phone app let you tick things off in a tap.' },
  { icon: Sparkles, title: 'Understand your week', line: 'Clear insights, an AI coach, and with Pro, Claude and ChatGPT connected to your plan.' },
];

/** "study" for students, "work" for everyone else. */
export function studyWord(role?: ProfileType) {
  return role === 'student' ? 'study' : 'work';
}

/** 4.5 → "4.5", 10 → "10+". */
export function hoursText(h: number) {
  if (h >= 10) return '10+';
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

/** "19:00" → "7:00 pm" (or "19:00" where the locale uses a 24-hour clock). */
export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  try {
    const d = new Date(2000, 0, 1, h, m);
    const lang = typeof navigator !== 'undefined' ? navigator.language : undefined;
    return new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(d).replace(/\s?([AP])M$/i, (_, x) => ` ${x.toLowerCase()}m`);
  } catch {
    return hhmm;
  }
}

/** Whole days from today to a YYYY-MM-DD date in local time. */
export function daysUntil(date: string): number | null {
  const [y, mo, d] = date.split('-').map(Number);
  if (!y || !mo || !d) return null;
  const target = new Date(y, mo - 1, d, 12);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function joinAnd(items: string[]) {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Screen 12 line: "{top 2 distractions joined with and}{, mostly on {top 2 apps}}. We'll plan around {both|it|them}."
 * "it" for 1 distraction, "both" for exactly 2, "them" for more.
 */
export function gotItLine(distractions: string[] = [], apps: string[] = []) {
  const top = distractions.slice(0, 2).map((d, i) => (i === 0 ? d : lowerFirst(d)));
  const topApps = apps.filter((a) => a !== 'Other').slice(0, 2);
  if (!top.length) return '';
  const pronoun = distractions.length === 1 ? 'it' : distractions.length === 2 ? 'both' : 'them';
  const mostly = topApps.length ? `, mostly on ${joinAnd(topApps)}` : '';
  return `${joinAnd(top)}${mostly}. We'll plan around ${pronoun}.`;
}

// ---------- Chapter 4 · Your setup ----------

/** Screen 15. The emoji is the habit icon (the user's pick). */
export const HABIT_OPTIONS: { name: string; icon: string }[] = [
  { name: 'Read 20 minutes', icon: '📚' },
  { name: 'Revise notes', icon: '📝' },
  { name: 'Workout', icon: '💪' },
  { name: 'Meditate', icon: '🧘' },
  { name: 'Drink water', icon: '💧' },
  { name: 'Sleep by 11', icon: '🌙' },
  { name: 'No phone for the first hour', icon: '📵' },
  { name: 'Journal', icon: '✍️' },
];

export const OTHER_HABIT = { label: 'Something else', icon: '➕' };
/** Icon saved with a habit typed into "Something else". */
export const CUSTOM_HABIT_ICON = '✨';

/** Students see "Revise notes" first. */
export function habitOptionsFor(role?: ProfileType) {
  if (role !== 'student') return HABIT_OPTIONS;
  const revise = HABIT_OPTIONS.find((h) => h.name === 'Revise notes')!;
  return [revise, ...HABIT_OPTIONS.filter((h) => h !== revise)];
}

/** Screen 17 name field, pre-filled from life stage. */
export function countdownNameFor(stage?: LifeStage) {
  switch (stage) {
    case 'competitive_exam': return 'My exam';
    case 'school_exams': return 'Board exams';
    case 'college': return 'Semester exams';
    case 'degree': return 'Final exams';
    default: return '';
  }
}

/** Screen 18 placeholder. */
export function taskPlaceholder(role?: ProfileType) {
  return role === 'student' ? 'Revise chapter 4' : 'Finish the proposal';
}

/** Screen 19, in minutes (360 = "6 hours or more"). */
export const GOAL_OPTIONS: ChoiceOption<number>[] = [
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 360, label: '6 hours or more' },
];

/** Numbers in the visitor's locale (section 5), so Indian visitors get "1,00,000" style grouping. */
export function formatNumber(n: number, maxFractionDigits = 1) {
  try {
    const lang = typeof navigator !== 'undefined' ? navigator.language : undefined;
    return new Intl.NumberFormat(lang, { maximumFractionDigits: maxFractionDigits }).format(n);
  } catch {
    return String(n);
  }
}
