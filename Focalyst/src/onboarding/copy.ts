import type { AcquisitionSource, BestFocusTime, DriftMinutes, HabitChoice, LifeStage, OnboardingAnswers, ProfileType } from './draft';

// Copy for screens 1 to 14 (IOS_ONBOARDING_DESIGN.md section 4).
// Sentence case, no em dashes, no exclamation marks.

export const TERMS_URL = 'https://focalyst.online/terms';
export const PRIVACY_URL = 'https://focalyst.online/privacy';

export const ROLE_OPTIONS: { value: ProfileType; title: string; line: string }[] = [
  { value: 'student', title: 'Student', line: 'School, college or exam prep' },
  { value: 'professional', title: 'Professional', line: 'A job with goals and deadlines' },
  { value: 'freelancer', title: 'Freelancer', line: 'Your own clients and schedule' },
  { value: 'creator', title: 'Creator', line: 'Content, art or a channel' },
  { value: 'entrepreneur', title: 'Entrepreneur', line: 'Building something of your own' },
];

export const LIFE_STAGE_OPTIONS: { value: LifeStage; title: string }[] = [
  { value: 'school_exams', title: 'School exams' },
  { value: 'college', title: 'College semesters' },
  { value: 'competitive_exam', title: 'A competitive exam, like NEET, JEE or UPSC' },
  { value: 'degree', title: 'A medical or professional degree' },
  { value: 'other', title: 'Something else' },
];

export const SOURCE_OPTIONS: { value: AcquisitionSource; title: string }[] = [
  { value: 'instagram', title: 'Instagram' },
  { value: 'youtube', title: 'YouTube' },
  { value: 'friend', title: 'A friend' },
  { value: 'app_store', title: 'App Store or Play Store' },
  { value: 'google', title: 'Google' },
  { value: 'other', title: 'Somewhere else' },
];

export const DISTRACTION_OPTIONS = [
  'Phone scrolling',
  'Social media',
  'Procrastination',
  'Too many tasks',
  'Low energy',
  'Overthinking',
  'Noise around me',
  'Not knowing where to start',
];

export const APP_OPTIONS = [
  'Instagram',
  'YouTube',
  'WhatsApp',
  'Snapchat',
  'Reels and Shorts',
  'Games',
  'Netflix',
  'X',
  'Reddit',
  'Facebook',
  'Other',
];

export const DRIFT_OPTIONS: { value: DriftMinutes; title: string }[] = [
  { value: 10, title: 'About 10 minutes' },
  { value: 25, title: 'About 25 minutes' },
  { value: 45, title: 'About 45 minutes' },
  { value: 60, title: 'An hour or more' },
];

export const BEST_TIME_OPTIONS: { value: BestFocusTime; title: string; line: string }[] = [
  { value: 'early_morning', title: 'Early morning', line: 'Before 8 am' },
  { value: 'morning', title: 'Morning', line: '8 am to noon' },
  { value: 'afternoon', title: 'Afternoon', line: 'Noon to 5 pm' },
  { value: 'evening', title: 'Evening', line: '5 pm to 9 pm' },
  { value: 'late_night', title: 'Late night', line: 'After 9 pm' },
];

/** "study" for students, otherwise "work". */
export function studyWord(answers: OnboardingAnswers): 'study' | 'work' {
  return answers.profile_type === 'student' ? 'study' : 'work';
}

function joinAnd(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Screen 12: "{top 2 distractions}{, mostly on {top 2 apps}}. We'll plan around {both|it|them}." */
export function gotItLine(answers: OnboardingAnswers): string {
  const distractions = (answers.distractions ?? []).slice(0, 2).map((d) => d.toLowerCase());
  const apps = (answers.distracting_apps ?? []).filter((a) => a !== 'Other').slice(0, 2);
  if (distractions.length === 0 && apps.length === 0) return "We'll plan around what pulls you away.";

  let lead = distractions.length > 0 ? joinAnd(distractions) : '';
  if (apps.length > 0) lead = lead ? `${lead}, mostly on ${joinAnd(apps)}` : `Mostly ${joinAnd(apps)}`;
  lead = lead.charAt(0).toUpperCase() + lead.slice(1);

  const target = apps.length > 0 ? 'them' : distractions.length === 2 ? 'both' : 'it';
  return `${lead}. We'll plan around ${target}.`;
}

// ─── Chapter 4 · Your setup ────────────────────────────────────────────────────

export const HABIT_OPTIONS: HabitChoice[] = [
  { name: 'Read 20 minutes', icon: '📚' },
  { name: 'Revise notes', icon: '📝' },
  { name: 'Workout', icon: '💪' },
  { name: 'Meditate', icon: '🧘' },
  { name: 'Drink water', icon: '💧' },
  { name: 'Sleep by 11', icon: '🌙' },
  { name: 'No phone for the first hour', icon: '📵' },
  { name: 'Journal', icon: '✍️' },
];

/** The "Something else" option shows ➕; the saved custom habit gets this icon. */
export const CUSTOM_HABIT_OPTION = '➕';
export const CUSTOM_HABIT_ICON = '⭐';
export const MAX_HABITS = 2;

/** Students see "Revise notes" first. */
export function habitOptions(answers: OnboardingAnswers): HabitChoice[] {
  if (answers.profile_type !== 'student') return HABIT_OPTIONS;
  const revise = HABIT_OPTIONS.find((h) => h.name === 'Revise notes')!;
  return [revise, ...HABIT_OPTIONS.filter((h) => h !== revise)];
}

/** Screen 17 name, pre-filled from the life stage. */
export function countdownNameFor(answers: OnboardingAnswers): string {
  switch (answers.life_stage) {
    case 'competitive_exam':
      return 'My exam';
    case 'school_exams':
      return 'Board exams';
    case 'college':
      return 'Semester exams';
    case 'degree':
      return 'Final exams';
    default:
      return '';
  }
}

export const GOAL_OPTIONS: { value: number; title: string }[] = [
  { value: 60, title: '1 hour' },
  { value: 120, title: '2 hours' },
  { value: 180, title: '3 hours' },
  { value: 240, title: '4 hours' },
  { value: 360, title: '6 hours or more' },
];

/** Where habit groups live in the app. */
export const GROUPS_LOCATION = 'Plan › Habits';

/** Apps for sentences: names only, "Other" left out. */
export function namedApps(answers: OnboardingAnswers): string[] {
  return (answers.distracting_apps ?? []).filter((a) => a !== 'Other');
}

export function joinWithAnd(items: string[]): string {
  return joinAnd(items);
}

/** Exactly what the existing join form accepts (components/plan/HabitGroupModals.tsx). */
export const cleanGroupCode = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

/** The app's existing invite text (components/plan/HabitGroupModals.tsx), kept identical. */
export function groupInviteMessage(inviteCode: string): string {
  return `Join my Focalyst Habit Group with code ${inviteCode}! Let's track our daily streaks together on the leaderboard.\n\nDownload Focalyst: https://focalyst.online/app`;
}
