import type { BestFocusTime, DriftMinutes, LifeStage, OnboardingAnswers } from './draft';
import { BEST_TIME_OPTIONS, CUSTOM_HABIT_ICON, ROLE_OPTIONS, joinWithAnd, namedApps, studyWord } from './copy';
import {
  DEFAULT_DRIFT,
  countdownPending,
  daysUntil,
  formatTime,
  hoursLabel,
  idealRhythm,
  reminderTimeOf,
  timeToDate,
} from './plan';
import { formatNumber, ramp, reclaimLabel, type OnboardingReport } from './report';

// The starting report (IOS_ONBOARDING_DESIGN.md sections 7.2 to 7.5). Pure.
// Sentences come word for word from the doc; a sentence whose data is missing is skipped.

export type ReportIcon = 'Smartphone' | 'Gauge' | 'ShieldCheck' | 'CalendarRange' | 'Repeat' | 'Hourglass' | 'Plug';

export type ReportBlock =
  | { type: 'text'; text: string }
  | { type: 'footnote'; text: string }
  | { type: 'rows'; rows: { label: string; text: string }[] }
  | { type: 'milestones'; rows: { week: number; hours: number; sessions: number }[] }
  | { type: 'chat'; user: string; reply: string; replyLabel: string };

export interface ReportSection {
  id: 'snapshot' | 'profile' | 'distractions' | 'plan12' | 'habits' | 'runway' | 'ai';
  title: string;
  icon: ReportIcon;
  /** Free sections show in full. Locked ones show the title and first block only (unless Pro). */
  free: boolean;
  blocks: ReportBlock[];
}

export interface StartingReport {
  overline: string;
  title: string;
  subtitle: string;
  chips: string[];
  sections: ReportSection[];
}

// ─── Lookups (7.5) ─────────────────────────────────────────────────────────────

const BEST_TIME_LABEL: Record<BestFocusTime, string> = {
  early_morning: 'before 8 am',
  morning: 'the morning',
  afternoon: 'the afternoon',
  evening: 'the evening',
  late_night: 'late at night',
};

const BEST_TIME_SENTENCE: Record<BestFocusTime, string> = {
  early_morning: 'You think clearest before 8 am, while the world is still quiet.',
  morning: 'Your sharpest hours are in the morning, between 8 am and noon.',
  afternoon: 'You hit your stride in the afternoon, between noon and 5 pm.',
  evening: 'Your best hours come in the evening, between 5 pm and 9 pm.',
  late_night: 'You do your best thinking late, after 9 pm.',
};

const DRIFT_SENTENCE: Record<DriftMinutes, string> = {
  10: 'Your attention drifts after about 10 minutes, so short, protected sessions will work better than long ones at first.',
  25: 'You can hold focus for about 25 minutes, which is exactly what the classic 25/5 rhythm is built for.',
  45: 'You can hold focus for about 45 minutes, long enough for real deep work.',
  60: 'You can hold focus for an hour or more, so long deep-work blocks suit you.',
};

const LIFE_STAGE_CHIP: Record<LifeStage, string | null> = {
  school_exams: 'School exams',
  college: 'College',
  competitive_exam: 'Competitive exam',
  degree: 'Professional degree',
  other: null,
};

function distractionTactic(name: string, bestTime: BestFocusTime | undefined): string | null {
  switch (name) {
    case 'Phone scrolling':
      return 'Keep your phone in another room or a bag during each session. Out of reach means you have to decide to get it, instead of reaching for it on autopilot.';
    case 'Social media':
      return 'Check social apps at set times, for example right after a session ends, instead of whenever you remember them. A fixed slot keeps them out of your focus time.';
    case 'Procrastination':
      return "Start with a session that's almost too small to skip: open the work and do 10 minutes. Once you've started, carrying on is much easier.";
    case 'Too many tasks':
      return 'Each evening, pick the one task that would make tomorrow a good day and put it first. Everything else waits until it\'s done.';
    case 'Low energy':
      return `Put your hardest work in your best hours${bestTime ? ` (${BEST_TIME_LABEL[bestTime]})` : ''} and save easy tasks for the rest. Use breaks to stand up, drink water or step outside, not to scroll.`;
    case 'Overthinking':
      return "Before each session, write the one thing you'll do in a single line. When your mind wanders, note the thought down and come back to that line.";
    case 'Noise around me':
      return 'Pick one spot and one sound (silence, earplugs or the same playlist) and use them only for focus. Over time the setting itself tells you it\'s time to work.';
    case 'Not knowing where to start':
      return 'End each day by writing tomorrow\'s first task. When you sit down, you start on it straight away instead of deciding.';
    default:
      return null;
  }
}

function appTactic(app: string, idealMinutes: number): string | null {
  switch (app) {
    case 'Instagram':
    case 'Snapchat':
    case 'Facebook':
    case 'X':
    case 'Reddit':
      return 'log out on your phone for a week, or turn on blocking during sessions. One extra step breaks the automatic tap.';
    case 'YouTube':
    case 'Reels and Shorts':
    case 'Netflix':
      return "turn off autoplay and save watching for after your last session of the day. Decide where you'll stop before you start.";
    case 'WhatsApp':
      return `mute chats during sessions and reply in batches between them. Most messages can wait ${idealMinutes} minutes.`;
    case 'Games':
      return 'play after your daily goal is done, not before. Make it the reward, not the warm-up.';
    default:
      return null;
  }
}

const HABIT_TACTIC: Record<string, string> = {
  'Read 20 minutes': "Link it to something you already do every day, like right after dinner, and keep the book where you'll see it.",
  'Revise notes':
    'Spend 15 minutes at the end of each {study} day on what you covered that day. Short, same-day reviews are easier to keep up than one long weekly session.',
  Workout: 'Put your clothes out the night before and decide the time in advance. On busy days, 10 minutes still counts.',
  Meditate: 'Do 5 minutes right after you wake up or before your first session. Same time, same place.',
  'Drink water': 'Keep a bottle on your desk, finish it by lunch, then refill it.',
  'Sleep by 11': 'Set a 10:30 pm wind-down alarm and leave your phone outside the bedroom.',
  'No phone for the first hour': 'Charge your phone away from your bed and use a separate alarm.',
  Journal: "Write 3 lines before bed: what went well, what didn't, and tomorrow's first task.",
};
const ANY_HABIT_TACTIC = 'Tie it to a fixed time or something you already do, and keep it small enough to do on your worst day.';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "12 Apr" */
function shortDate(d: Date, locale?: string): string {
  return `${d.getDate()} ${d.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// ─── Builder ───────────────────────────────────────────────────────────────────

export function buildStartingReport({
  answers,
  report,
  isPro,
  today = new Date(),
  locale,
}: {
  answers: OnboardingAnswers;
  report: OnboardingReport;
  isPro: boolean;
  today?: Date;
  locale?: string;
}): StartingReport {
  const study = studyWord(answers);
  const isStudent = answers.profile_type === 'student';
  const H = formatNumber(report.H);
  const hUnit = report.H === 1 ? 'hour' : 'hours';
  const G = report.G;
  const drift = answers.focus_drift_minutes ?? DEFAULT_DRIFT;
  const rhythm = idealRhythm(drift);
  const idealMinutes = rhythm.focusMinutes;
  const breakMinutes = rhythm.breakMinutes;
  const reminder = reminderTimeOf(answers);
  const apps = namedApps(answers);
  const habits = (answers.habits ?? []).filter((h) => h.name.trim());
  const sections: ReportSection[] = [];

  // Section 1 · Your time snapshot (free)
  {
    const blocks: ReportBlock[] = [];
    blocks.push({
      type: 'text',
      text:
        report.H >= 2
          ? `At ${H} ${hUnit} a day, your phone takes about ${formatNumber(report.yearlyPhoneHours)} hours a year. That's around ${formatNumber(report.wakingDays)} waking days.`
          : `At ${H} ${hUnit} a day, that's ${formatNumber(report.yearlyPhoneHours)} hours a year on your phone. A healthy base to build on.`,
    });
    if (apps.length > 0) {
      const more = apps.length > 2 ? `, plus ${apps.length - 2} more` : '';
      blocks.push({ type: 'text', text: `Most of it goes to ${apps.slice(0, 2).join(' and ')}${more}.` });
    }
    blocks.push({
      type: 'text',
      text: `Win back ${reclaimLabel(report)} a day and that's ${formatNumber(report.reclaimHoursYear)} hours a year for ${study}, about ${report.reclaimWeeks} weeks of full-time ${study}.`,
    });
    blocks.push({
      type: 'footnote',
      text: `Estimate from your answers: ${H} ${hUnit} a day, 365 days, 16 waking hours a day.`,
    });
    sections.push({ id: 'snapshot', title: 'Your time snapshot', icon: 'Smartphone', free: true, blocks });
  }

  // Section 2 · Your focus profile (free)
  {
    const blocks: ReportBlock[] = [];
    if (answers.best_focus_time) blocks.push({ type: 'text', text: BEST_TIME_SENTENCE[answers.best_focus_time] });
    if (answers.focus_drift_minutes) blocks.push({ type: 'text', text: DRIFT_SENTENCE[answers.focus_drift_minutes] });
    let plan = `Your plan starts with 25/5 sessions at ${formatTime(reminder)}, building to ${hoursLabel(G)} a day.`;
    if (idealMinutes > 25) plan += ` Your full report has a schedule built on ${idealMinutes}-minute sessions.`;
    blocks.push({ type: 'text', text: plan });
    sections.push({ id: 'profile', title: 'Your focus profile', icon: 'Gauge', free: true, blocks });
  }

  // Section 3 · Your distraction plan (locked)
  {
    const blocks: ReportBlock[] = [{ type: 'text', text: "Here's how to handle what pulls you away, one by one." }];
    const distractionRows = (answers.distractions ?? [])
      .slice(0, 3)
      .map((d) => ({ label: d, text: distractionTactic(d, answers.best_focus_time) }))
      .filter((r): r is { label: string; text: string } => r.text !== null);
    if (distractionRows.length > 0) blocks.push({ type: 'rows', rows: distractionRows });
    const appRows = apps
      .map((a) => ({ label: a, text: appTactic(a, idealMinutes) }))
      .filter((r): r is { label: string; text: string } => r.text !== null)
      .slice(0, 3)
      .map((r) => ({ label: r.label, text: capitalize(r.text) }));
    if (appRows.length > 0) blocks.push({ type: 'rows', rows: appRows });
    if (apps.length > 0) blocks.push({ type: 'text', text: `During focus sessions, blocking can pause ${joinWithAnd(apps)}.` });
    blocks.push({
      type: 'text',
      text: answers.blocking_set_up ? "You've already turned on gentle mode." : 'Turn it on from the Focus tab.',
    });
    blocks.push({ type: 'text', text: 'Gentle mode is free; strong modes are part of Pro.' });
    sections.push({ id: 'distractions', title: 'Your distraction plan', icon: 'ShieldCheck', free: false, blocks });
  }

  // Section 4 · Your 12-week focus plan (locked)
  {
    const weekly = report.weekly;
    const blocks: ReportBlock[] = [
      {
        type: 'text',
        text: `Your plan builds from ${formatNumber(weekly[0])} hours in week 1 to ${formatNumber(G * 7)} hours a week by week 6.`,
      },
    ];
    const n = Math.max(1, Math.round((G * 60) / idealMinutes));
    const start = timeToDate(reminder, today);
    const end = new Date(start.getTime() + (n * idealMinutes + (n - 1) * breakMinutes) * 60_000);
    const latest = timeToDate('23:30', today);
    const sameDay = end.getDate() === start.getDate() && end <= latest;
    const fmt = (d: Date) => formatTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    blocks.push({
      type: 'rows',
      rows: [
        { label: 'Session rhythm', text: `${idealMinutes} minutes of focus, ${breakMinutes} minutes of rest` },
        {
          label: 'Your day at full goal',
          text: sameDay
            ? `Start at ${fmt(start)}: ${n} sessions with ${breakMinutes}-minute breaks, done by ${fmt(end)}.`
            : `${n} sessions of ${idealMinutes} minutes a day. Start the first at ${fmt(start)} and split the rest across your day.`,
        },
      ],
    });
    blocks.push({
      type: 'milestones',
      rows: [1, 3, 6, 12].map((k) => ({
        week: k,
        hours: weekly[k - 1],
        sessions: Math.max(1, Math.round((weekly[k - 1] * 60) / 7 / idealMinutes)),
      })),
    });
    blocks.push({
      type: 'text',
      text: `From week 6 you're at your full goal. Keep it there and you reach up to ${formatNumber(report.total12)} focused hours by week 12.`,
    });
    sections.push({ id: 'plan12', title: 'Your 12-week focus plan', icon: 'CalendarRange', free: false, blocks });
  }

  // Section 5 · Your habit strategy (locked; only if habits were picked)
  if (habits.length > 0) {
    const blocks: ReportBlock[] = [
      {
        type: 'text',
        text:
          habits.length === 1
            ? 'One small habit, done daily, is the best place to start.'
            : 'Two small habits, done daily, are easier to keep than one big one.',
      },
      {
        type: 'rows',
        rows: habits.map((h) => ({
          label: h.name,
          text:
            h.icon === CUSTOM_HABIT_ICON
              ? ANY_HABIT_TACTIC
              : (HABIT_TACTIC[h.name] ?? ANY_HABIT_TACTIC).replace('{study}', study),
        })),
      },
    ];
    const mode = answers.group?.mode ?? 'none';
    blocks.push({
      type: 'text',
      text:
        mode === 'create'
          ? "Your group: share your code. Seeing each other's streaks every day gives everyone a reason not to break theirs."
          : mode === 'join'
            ? "You're tracking with your group. Check the leaderboard in Plan › Habits after each check-in."
            : 'Want backup? Start a group of up to 5 friends in Plan › Habits.',
    });
    blocks.push({ type: 'text', text: "You'll miss a day at some point. The rule is simple: never miss twice." });
    sections.push({ id: 'habits', title: 'Your habit strategy', icon: 'Repeat', free: false, blocks });
  }

  // Section 6 · Your {countdown name} runway (locked; only with a countdown)
  if (answers.countdown) {
    const cd = answers.countdown;
    const days = daysUntil(cd.date, today);
    const weeksLeft = Math.floor(days / 7);
    let sum = 0;
    for (let k = 1; k <= weeksLeft; k++) sum += G * 7 * ramp(k);
    const hoursBefore = Math.round(sum);
    const blocks: ReportBlock[] = [{ type: 'text', text: `${cd.name} is ${days} days away.` }];
    blocks.push({
      type: 'text',
      text:
        weeksLeft >= 1
          ? `Following your plan, that's up to ${formatNumber(hoursBefore)} focused hours before the day.`
          : `Every session counts now: ${hoursLabel(G)} a day gives you up to ${formatNumber(G * days)} hours before the day.`,
    });
    const target = fromIso(cd.date);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const candidates: { date: Date; text: string; when: boolean }[] = isStudent
      ? [
          { date: addDays(target, -28), text: 'finish new topics', when: days > 35 },
          { date: addDays(target, -14), text: 'revision and practice papers only', when: true },
          { date: addDays(target, -3), text: 'light review and early nights', when: true },
        ]
      : [
          { date: addDays(todayStart, Math.floor(days / 2)), text: 'halfway check', when: days >= 14 },
          { date: addDays(target, -7), text: 'final list, nothing new', when: true },
          { date: addDays(target, -2), text: 'wrap up and rest', when: true },
        ];
    const checkpoints = candidates
      .filter((c) => c.when && c.date > todayStart)
      .map((c) => ({ label: shortDate(c.date, locale), text: capitalize(c.text) }));
    if (checkpoints.length > 0) blocks.push({ type: 'rows', rows: checkpoints });
    if (countdownPending(answers, isPro, today)) {
      blocks.push({ type: 'text', text: 'With Pro, this countdown goes on your plan straight away.' });
    }
    sections.push({ id: 'runway', title: `Your ${cd.name} runway`, icon: 'Hourglass', free: false, blocks });
  }

  // Section 7 · Ask your AI about this report (locked)
  {
    const tasks = (answers.tasks ?? []).filter((t) => t.trim());
    const habit = habits[0] ? lowerFirst(habits[0].name) : null;
    let reply = '';
    if (tasks.length > 0) {
      const more = tasks.length > 1 ? ` and ${tasks.length - 1} more` : '';
      reply = `You have ${tasks[0]}${more} for tomorrow. Start with ${tasks[0]} in a ${idealMinutes}-minute session`;
    } else {
      reply = `Start with a ${idealMinutes}-minute session`;
    }
    reply += habit ? `, then tick off ${habit}.` : '.';
    const blocks: ReportBlock[] = [
      { type: 'text', text: 'With Pro, you can connect Claude or ChatGPT to Focalyst and talk through this plan.' },
      { type: 'chat', user: 'What should I do first tomorrow?', reply, replyLabel: 'Claude' },
      {
        type: 'text',
        text: `Try asking: "Plan my week around ${answers.countdown?.name ?? 'my goal'}" or "Which habit am I slipping on?"`,
      },
      {
        type: 'text',
        text: "It reads your plan and nobody else's. Pro includes 500 credits a month, plus 10 for each day you open Focalyst.",
      },
    ];
    sections.push({ id: 'ai', title: 'Ask your AI about this report', icon: 'Plug', free: false, blocks });
  }

  // Header (7.3)
  const role = ROLE_OPTIONS.find((r) => r.value === answers.profile_type)?.title;
  const stage = answers.life_stage && isStudent ? LIFE_STAGE_CHIP[answers.life_stage] : null;
  const best = BEST_TIME_OPTIONS.find((b) => b.value === answers.best_focus_time)?.title;
  const date = today.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  return {
    overline: 'YOUR STARTING REPORT',
    title: answers.name ? `${answers.name}, here's where you're starting.` : "Here's where you're starting.",
    subtitle: `Built from your answers on ${date}.`,
    chips: [role, stage, best].filter((c): c is string => !!c),
    sections,
  };
}

/** The lock card line: "{locked section names}, all built from your answers." */
export function lockedSummary(report: StartingReport): string {
  const names = report.sections.filter((s) => !s.free).map((s, i) => (i === 0 ? s.title : lowerFirst(s.title)));
  return `${joinWithAnd(names)}, all built from your answers.`;
}
