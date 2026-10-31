export const SITE_URL = 'https://focalyst.online';

// blog_config is not readable from the browser, so the CTA links live here too
export const APP_CTA_URL = 'https://focalyst.online/app';
export const WEB_CTA_URL = 'https://focalyst.online/start';

export const PILLARS = {
  focus: {
    name: 'Focus and deep work',
    intro: "How to protect your attention long enough to do work you're proud of.",
  },
  study: {
    name: 'Study systems',
    intro: 'Timetables, revision and exam planning for students with more syllabus than time.',
  },
  compare: {
    name: 'Comparisons and alternatives',
    intro: 'Honest comparisons of Focalyst and other productivity apps.',
  },
  habits: {
    name: 'Habits and consistency',
    intro: 'Building habits that last past week two, alone or with friends.',
  },
  ai: {
    name: 'AI for productivity',
    intro: 'Using AI with your real plan, without handing over your thinking.',
  },
  attention: {
    name: 'Screen time and distraction',
    intro: 'Screen time, doomscrolling and the tools that put you back in charge.',
  },
  planning: {
    name: 'Planning and time',
    intro: 'Planning days and weeks around what matters and the energy you have.',
  },
} as const;

export type Pillar = keyof typeof PILLARS;

export const PILLAR_KEYS = Object.keys(PILLARS) as Pillar[];

export function isPillar(value: unknown): value is Pillar {
  return typeof value === 'string' && value in PILLARS;
}

export function ctaUrl(base: string, medium: 'inline' | 'end', slug: string) {
  return `${base}?utm_source=blog&utm_medium=${medium}&utm_campaign=${encodeURIComponent(slug)}`;
}

export const AI_DISCLOSURE =
  "Written with AI assistance from the sources listed above and checked against Focalyst's product notes.";
