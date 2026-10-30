// "Your starting report" (WEB_ONBOARDING_REPORT.md R2, R4 and R5). Pure functions, no React.
// Every sentence comes from the R4 tables; a sentence whose data is missing is left out.
import type { BestFocusTime, DriftMinutes, LifeStage, OnboardingAnswers, ProfileType } from './draft';
import { FOCUS_TIME_SUGGESTIONS } from './plan';
import { computeOnboardingReport, ramp, type ReportSnapshot } from './report';

export type Block =
  | { kind: 'paragraph'; text: string; footnote?: boolean }
  | { kind: 'rows'; rows: { label: string; text: string }[] }
  | { kind: 'table'; caption: string; head: string[]; rows: string[][] }
  /** Section 7: the chat preview component from P4. */
  | { kind: 'chat' };

export type SectionId = 'time' | 'focus' | 'distractions' | 'twelve' | 'habits' | 'countdown' | 'ai';

export interface Section {
  id: SectionId;
  title: string;
  /** Free sections are always readable; the others unlock with Pro. */
  free: boolean;
  /** For a locked section, the first block is its readable first sentence. */
  blocks: Block[];
}

export interface StartingReport {
  overline: string;
  title: string;
  subtitle: string;
  /** Role, life stage and best time. */
  chips: string[];
  sections: Section[];
}

export interface StartingReportInput {
  answers: OnboardingAnswers;
  report?: Partial<ReportSnapshot> | null;
  isPro: boolean;
  /** Today, as a Date (read in the user's time zone) or YYYY-MM-DD. */
  today: Date | string;
  locale?: string;
  timeZone?: string;
  /** The day the answers were saved (the header line). Defaults to today. */
  builtOn?: Date | string;
}

// ---------- R5 lookups ----------

const ROLE: Record<ProfileType, string> = {
  student: 'Student', professional: 'Professional', freelancer: 'Freelancer', creator: 'Creator', entrepreneur: 'Entrepreneur',
};

const LIFE_STAGE: Record<LifeStage, string> = {
  school_exams: 'School exams', college: 'College semesters', competitive_exam: 'Competitive exam',
  degree: 'Medical or professional degree', other: 'Something else',
};

const BEST_TIME_CHIP: Record<BestFocusTime, string> = {
  early_morning: 'Early morning focus', morning: 'Morning focus', afternoon: 'Afternoon focus',
  evening: 'Evening focus', late_night: 'Late night focus',
};

export const BEST_TIME_LABEL: Record<BestFocusTime, string> = {
  early_morning: 'before 8 am', morning: 'the morning', afternoon: 'the afternoon', evening: 'the evening', late_night: 'late at night',
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

/** Rhythm from drift (R5): idealMinutes and break. */
export function idealRhythm(drift?: DriftMinutes): { minutes: 25 | 45 | 60; rest: 5 | 10 | 15 } {
  if (drift === 45) return { minutes: 45, rest: 10 };
  if (drift === 60) return { minutes: 60, rest: 15 };
  return { minutes: 25, rest: 5 };
}

const DISTRACTION_TACTIC: Record<string, (bestTimeLabel: string) => string> = {
  'Phone scrolling': () => 'Keep your phone in another room or a bag during each session. Out of reach means you have to decide to get it, instead of reaching for it on autopilot.',
  'Social media': () => 'Check social apps at set times, for example right after a session ends, instead of whenever you remember them. A fixed slot keeps them out of your focus time.',
  'Procrastination': () => "Start with a session that's almost too small to skip: open the work and do 10 minutes. Once you've started, carrying on is much easier.",
  'Too many tasks': () => 'Each evening, pick the one task that would make tomorrow a good day and put it first. Everything else waits until it\'s done.',
  'Low energy': (b) => `Put your hardest work in your best hours (${b}) and save easy tasks for the rest. Use breaks to stand up, drink water or step outside, not to scroll.`,
  'Overthinking': () => "Before each session, write the one thing you'll do in a single line. When your mind wanders, note the thought down and come back to that line.",
  'Noise around me': () => 'Pick one spot and one sound (silence, earplugs or the same playlist) and use them only for focus. Over time the setting itself tells you it\'s time to work.',
  'Not knowing where to start': () => "End each day by writing tomorrow's first task. When you sit down, you start on it straight away instead of deciding.",
};

const SOCIAL_APPS = ['Instagram', 'Snapchat', 'Facebook', 'X', 'Reddit'];
const WATCH_APPS = ['YouTube', 'Reels and Shorts', 'Netflix'];

/** The tactic after "{app}: "; the app name is the row's bold label. */
function appTactic(app: string, idealMinutes: number): string | null {
  if (SOCIAL_APPS.includes(app)) return `Log out on your phone for a week, or turn on blocking during sessions. One extra step breaks the automatic tap.`;
  if (WATCH_APPS.includes(app)) return `Turn off autoplay and save watching for after your last session of the day. Decide where you'll stop before you start.`;
  if (app === 'WhatsApp') return `Mute chats during sessions and reply in batches between them. Most messages can wait ${idealMinutes} minutes.`;
  if (app === 'Games') return 'Play after your daily goal is done, not before. Make it the reward, not the warm-up.';
  return null;
}

function habitTactic(name: string, study: string): string {
  switch (name) {
    case 'Read 20 minutes': return "Link it to something you already do every day, like right after dinner, and keep the book where you'll see it.";
    case 'Revise notes': return `Spend 15 minutes at the end of each ${study} day on what you covered that day. Short, same-day reviews are easier to keep up than one long weekly session.`;
    case 'Workout': return 'Put your clothes out the night before and decide the time in advance. On busy days, 10 minutes still counts.';
    case 'Meditate': return 'Do 5 minutes right after you wake up or before your first session. Same time, same place.';
    case 'Drink water': return 'Keep a bottle on your desk, finish it by lunch, then refill it.';
    case 'Sleep by 11': return 'Set a 10:30 pm wind-down alarm and leave your phone outside the bedroom.';
    case 'No phone for the first hour': return 'Charge your phone away from your bed and use a separate alarm.';
    case 'Journal': return "Write 3 lines before bed: what went well, what didn't, and tomorrow's first task.";
    default: return 'Tie it to a fixed time or something you already do, and keep it small enough to do on your worst day.';
  }
}

// ---------- Formatting (R2: browser locale, user's time zone) ----------

function makeFormat(locale?: string) {
  const num = (n: number, digits = 1) => {
    try { return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n); } catch { return String(n); }
  };
  /** Minutes after midnight → "7:00 pm" or "19:00". */
  const time = (mins: number) => {
    const d = new Date(Date.UTC(2000, 0, 1, Math.floor(mins / 60), mins % 60));
    try {
      return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
        .format(d)
        .replace(/\s?([AP])\.?\s?M\.?$/i, (_, x: string) => ` ${x.toLowerCase()}m`);
    } catch {
      return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    }
  };
  /** A day number (days since 1970) → "12 Apr". */
  const day = (dayNum: number, withYear = false) => {
    const d = new Date(dayNum * 86400000);
    try {
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(d);
    } catch {
      return d.toISOString().slice(0, 10);
    }
  };
  const hours = (h: number) => `${num(h)} ${h === 1 ? 'hour' : 'hours'}`;
  return { num, time, day, hours };
}

/** YYYY-MM-DD (or a Date read in the time zone) → whole days since 1970. */
function dayNumber(v: Date | string, timeZone?: string): number | null {
  let ymd: string;
  if (typeof v === 'string') ymd = v.slice(0, 10);
  else {
    try {
      ymd = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(v);
    } catch {
      ymd = v.toISOString().slice(0, 10);
    }
  }
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

function hhmmToMinutes(hhmm?: string): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return Number.isInteger(h) && Number.isInteger(m) ? h * 60 + m : null;
}

function joinAnd(items: string[]) {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function firstWord(name?: string) {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

// ---------- The builder ----------

export function buildStartingReport(input: StartingReportInput): StartingReport {
  const { answers: a, isPro, locale } = input;
  const timeZone = input.timeZone ?? (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } })();
  const f = makeFormat(locale);
  const today = dayNumber(input.today, timeZone) ?? Math.floor(Date.now() / 86400000);
  const builtOn = input.builtOn ? dayNumber(input.builtOn, timeZone) ?? today : today;

  const base = computeOnboardingReport(a);
  const r = { ...base, ...(input.report ?? {}) };
  const H = r.H ?? base.H;
  const G = r.G ?? base.G;
  const weekly = Array.isArray(r.weekly) && r.weekly.length === 12 ? r.weekly : base.weekly;
  const reclaimLabel = (r.reclaimMinutes ?? base.reclaimMinutes) === 60 ? '1 hour' : '30 minutes';

  const study = a.profile_type === 'student' ? 'study' : 'work';
  const best = a.best_focus_time;
  const bestLabel = best ? BEST_TIME_LABEL[best] : null;
  const { minutes: ideal, rest } = idealRhythm(a.focus_drift_minutes);
  const reminder = hhmmToMinutes(a.reminder_time) ?? hhmmToMinutes(FOCUS_TIME_SUGGESTIONS[best ?? 'evening'][0]);
  const apps = (a.distracting_apps ?? []).filter((x) => x && x !== 'Other');

  const name = firstWord(a.name);
  const sections: Section[] = [];

  // 1 · Your time snapshot (free)
  {
    const blocks: Block[] = [];
    const Hs = f.hours(H);
    blocks.push({
      kind: 'paragraph',
      text: H >= 2
        ? `At ${Hs} a day, your phone takes about ${f.num(r.yearlyPhoneHours ?? base.yearlyPhoneHours, 0)} hours a year. That's around ${f.num(r.wakingDays ?? base.wakingDays, 0)} waking days.`
        : `At ${Hs} a day, that's ${f.num(r.yearlyPhoneHours ?? base.yearlyPhoneHours, 0)} hours a year on your phone. A healthy base to build on.`,
    });
    if (apps.length) {
      const two = apps.slice(0, 2);
      const more = apps.length > 2 ? `, plus ${apps.length - 2} more` : '';
      blocks.push({ kind: 'paragraph', text: `Most of it goes to ${two.join(' and ')}${more}.` });
    }
    blocks.push({
      kind: 'paragraph',
      text: `Win back ${reclaimLabel} a day and that's ${f.num(r.reclaimHoursYear ?? base.reclaimHoursYear, 0)} hours a year for ${study}, about ${f.num(r.reclaimWeeks ?? base.reclaimWeeks, 0)} weeks of full-time ${study}.`,
    });
    blocks.push({ kind: 'paragraph', footnote: true, text: `Estimate from your answers: ${Hs} a day, 365 days, 16 waking hours a day.` });
    sections.push({ id: 'time', title: 'Your time snapshot', free: true, blocks });
  }

  // 2 · Your focus profile (free)
  {
    const lines: string[] = [];
    if (best) lines.push(BEST_TIME_SENTENCE[best]);
    if (a.focus_drift_minutes) lines.push(DRIFT_SENTENCE[a.focus_drift_minutes]);
    // A Pro plan already uses the longer rhythm (7.1), so it starts there.
    const startRhythm = isPro && ideal > 25 ? `${ideal}/${rest}` : '25/5';
    if (reminder !== null) lines.push(`Your plan starts with ${startRhythm} sessions at ${f.time(reminder)}, building to ${f.hours(G)} a day.`);
    if (ideal > 25) lines.push(`Your full report has a schedule built on ${ideal}-minute sessions.`);
    sections.push({ id: 'focus', title: 'Your focus profile', free: true, blocks: [{ kind: 'paragraph', text: lines.join(' ') }] });
  }

  // 3 · Your distraction plan (locked)
  {
    const rows: { label: string; text: string }[] = [];
    for (const d of (a.distractions ?? []).slice(0, 3)) {
      const t = DISTRACTION_TACTIC[d];
      if (t && (d !== 'Low energy' || bestLabel)) rows.push({ label: d, text: t(bestLabel ?? '') });
    }
    const appRows = apps
      .map((app) => ({ app, text: appTactic(app, ideal) }))
      .filter((x): x is { app: string; text: string } => Boolean(x.text))
      .slice(0, 3)
      .map((x) => ({ label: x.app, text: x.text }));
    if (rows.length || appRows.length) {
      const blocks: Block[] = [{ kind: 'paragraph', text: "Here's how to handle what pulls you away, one by one." }];
      if (rows.length) blocks.push({ kind: 'rows', rows });
      if (appRows.length) blocks.push({ kind: 'rows', rows: appRows });
      if (apps.length) {
        blocks.push({
          kind: 'paragraph',
          text: `On the Focalyst phone app, blocking can pause ${joinAnd(apps)} during focus sessions. Gentle mode is free; strong modes are part of Pro.`,
        });
      }
      sections.push({ id: 'distractions', title: 'Your distraction plan', free: false, blocks });
    }
  }

  // 4 · Your 12-week focus plan (locked)
  {
    const blocks: Block[] = [
      { kind: 'paragraph', text: `Your plan builds from ${f.num(weekly[0])} hours in week 1 to ${f.num(Math.round(G * 7 * 10) / 10)} hours a week by week 6.` },
    ];
    const n = Math.max(1, Math.round((G * 60) / ideal));
    const rows = [{ label: 'Session rhythm', text: `${ideal} minutes of focus, ${rest} minutes of rest` }];
    if (reminder !== null) {
      const end = reminder + n * ideal + (n - 1) * rest;
      rows.push({
        label: 'Your day at full goal',
        text: end <= 23 * 60 + 30
          ? `Start at ${f.time(reminder)}: ${n} sessions with ${rest}-minute breaks, done by ${f.time(end)}.`
          : `${n} sessions of ${ideal} minutes a day. Start the first at ${f.time(reminder)} and split the rest across your day.`,
      });
    }
    blocks.push({ kind: 'rows', rows });
    blocks.push({
      kind: 'table',
      caption: 'Milestones',
      head: ['Week', 'Focus hours', 'Sessions a day'],
      rows: [1, 3, 6, 12].map((k) => [
        String(k),
        f.num(weekly[k - 1]),
        String(Math.max(1, Math.round((weekly[k - 1] * 60) / 7 / ideal))),
      ]),
    });
    blocks.push({
      kind: 'paragraph',
      text: `From week 6 you're at your full goal. Keep it there and you reach up to ${f.num(r.total12 ?? base.total12, 0)} focused hours by week 12.`,
    });
    sections.push({ id: 'twelve', title: 'Your 12-week focus plan', free: false, blocks });
  }

  // 5 · Your habit strategy (locked, only with habits)
  const habits = (a.habits ?? []).filter((h) => h?.name?.trim());
  if (habits.length) {
    const mode = a.group?.mode ?? 'none';
    const groupLine =
      mode === 'create'
        ? "Your group: share your code. Seeing each other's streaks every day gives everyone a reason not to break theirs."
        : mode === 'join'
          ? "You're tracking with your group. Check the leaderboard in Plan › Habits after each check-in."
          : 'Want backup? Start a group of up to 5 friends in Plan › Habits.';
    sections.push({
      id: 'habits',
      title: 'Your habit strategy',
      free: false,
      blocks: [
        {
          kind: 'paragraph',
          text: habits.length > 1
            ? 'Two small habits, done daily, are easier to keep than one big one.'
            : 'One small habit, done daily, is the best place to start.',
        },
        { kind: 'rows', rows: habits.map((h) => ({ label: h.name, text: habitTactic(h.name, study) })) },
        { kind: 'paragraph', text: groupLine },
        { kind: 'paragraph', text: "You'll miss a day at some point. The rule is simple: never miss twice." },
      ],
    });
  }

  // 6 · Your {countdown name} runway (locked, only with a countdown)
  const cd = a.countdown;
  const target = cd?.date ? dayNumber(cd.date) : null;
  if (cd?.name && target !== null && target > today) {
    const days = target - today;
    const weeksLeft = Math.floor(days / 7);
    let hoursBefore = 0;
    for (let k = 1; k <= weeksLeft; k++) hoursBefore += G * 7 * ramp(k);
    const blocks: Block[] = [
      { kind: 'paragraph', text: `${cd.name} is ${f.num(days, 0)} ${days === 1 ? 'day' : 'days'} away.` },
      {
        kind: 'paragraph',
        text: weeksLeft >= 1
          ? `Following your plan, that's up to ${f.num(Math.round(hoursBefore), 0)} focused hours before the day.`
          : `Every session counts now: ${f.hours(G)} a day gives you up to ${f.num(Math.round(G * days * 10) / 10)} hours before the day.`,
      },
    ];
    const marks: { at: number; text: string; show: boolean }[] =
      a.profile_type === 'student'
        ? [
            { at: target - 28, text: 'finish new topics', show: days > 35 },
            { at: target - 14, text: 'revision and practice papers only', show: true },
            { at: target - 3, text: 'light review and early nights', show: true },
          ]
        : [
            { at: today + Math.floor(days / 2), text: 'halfway check', show: days >= 14 },
            { at: target - 7, text: 'final list, nothing new', show: true },
            { at: target - 2, text: 'wrap up and rest', show: true },
          ];
    const rows = marks.filter((m) => m.show && m.at > today).map((m) => ({ label: f.day(m.at), text: m.text }));
    if (rows.length) blocks.push({ kind: 'rows', rows });
    if (!isPro && days > 90) blocks.push({ kind: 'paragraph', text: 'With Pro, this countdown goes on your plan straight away.' });
    sections.push({ id: 'countdown', title: `Your ${cd.name} runway`, free: false, blocks });
  }

  // 7 · Ask your AI about this report (locked)
  sections.push({
    id: 'ai',
    title: 'Ask your AI about this report',
    free: false,
    blocks: [
      { kind: 'paragraph', text: 'With Pro, you can connect Claude or ChatGPT to Focalyst and talk through this plan.' },
      { kind: 'chat' },
      { kind: 'paragraph', text: `Try asking: "Plan my week around ${cd?.name || 'my goal'}" or "Which habit am I slipping on?"` },
      { kind: 'paragraph', text: "It reads your plan and nobody else's. Pro includes 500 credits a month, plus 10 for each day you open Focalyst." },
    ],
  });

  const chips: string[] = [];
  if (a.profile_type) chips.push(ROLE[a.profile_type]);
  if (a.profile_type === 'student' && a.life_stage) chips.push(LIFE_STAGE[a.life_stage]);
  if (best) chips.push(BEST_TIME_CHIP[best]);

  return {
    overline: 'YOUR STARTING REPORT',
    title: name ? `${name}, here's where you're starting.` : "Here's where you're starting.",
    subtitle: `Built from your answers on ${f.day(builtOn, true)}.`,
    chips,
    sections,
  };
}

/** Names of the locked sections this user has, for the lock card: "A, B and C". */
export function lockedSectionNames(report: StartingReport): string {
  return joinAnd(report.sections.filter((s) => !s.free).map((s) => s.title));
}

/** Plain text, for checks and debugging. */
export function startingReportText(report: StartingReport): string {
  const out: string[] = [report.overline, report.title, report.subtitle, report.chips.join(' · '), ''];
  for (const s of report.sections) {
    out.push(`## ${s.title}${s.free ? '' : ' [Pro]'}`);
    for (const b of s.blocks) {
      if (b.kind === 'paragraph') out.push(b.footnote ? `  (${b.text})` : b.text);
      else if (b.kind === 'rows') b.rows.forEach((row) => out.push(`- ${row.label}: ${row.text}`));
      else if (b.kind === 'table') {
        out.push(`${b.caption}: ${b.head.join(' | ')}`);
        b.rows.forEach((row) => out.push(`  ${row.join(' | ')}`));
      } else out.push('[chat preview]');
    }
    out.push('');
  }
  return out.join('\n');
}
