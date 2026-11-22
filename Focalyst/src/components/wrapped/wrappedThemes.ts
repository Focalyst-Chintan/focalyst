import type { WrappedArchetypeKey } from '../../services/wrappedService';

export type WrappedCardKind =
  | 'intro'
  | 'focus'
  | 'tasks'
  | 'habits'
  | 'voice_ai'
  | 'blocker'
  | 'victory';

export interface RadialStop {
  offset: string;
  color: string;
  opacity: number;
}

export interface EllipseBloomSpec {
  cx: string;
  cy: string;
  rx: string;
  ry: string;
  stops: RadialStop[];
}

export interface WrappedPosterTheme {
  baseBg: string;
  washColors: [string, string, string];
  washLocations: [number, number, number];
  blooms: [EllipseBloomSpec, EllipseBloomSpec, EllipseBloomSpec];
  accentColor: string;
  hairlineColor: string;
}

export const WRAPPED_CANVAS_BG = '#020307';

function buildSevenStops(
  coreColor: string,
  midColor: string,
  outerColor: string,
  baseBg: string,
  peakOpacity = 0.95
): RadialStop[] {
  return [
    { offset: '0%', color: coreColor, opacity: peakOpacity },
    { offset: '16%', color: coreColor, opacity: Number((peakOpacity * 0.76).toFixed(2)) },
    { offset: '34%', color: midColor, opacity: Number((peakOpacity * 0.47).toFixed(2)) },
    { offset: '52%', color: midColor, opacity: Number((peakOpacity * 0.23).toFixed(2)) },
    { offset: '70%', color: outerColor, opacity: 0.08 },
    { offset: '86%', color: baseBg, opacity: 0.02 },
    { offset: '100%', color: baseBg, opacity: 0 },
  ];
}

export const WRAPPED_POSTER_THEMES: Record<
  Exclude<WrappedCardKind, 'victory'>,
  WrappedPosterTheme
> = {
  // Intro (Indigo Sweep): #020307 deep black upper-right + broad #0043EE / #1951FC cobalt sweep + #3DC8FF soft core
  intro: {
    baseBg: '#020307',
    washColors: ['#020307', 'rgba(0, 67, 238, 0.16)', 'rgba(25, 81, 252, 0.24)'],
    washLocations: [0, 0.5, 1],
    blooms: [
      {
        cx: '18%',
        cy: '84%',
        rx: '115%',
        ry: '88%',
        stops: buildSevenStops('#0043EE', '#1951FC', '#031240', '#020307', 0.92),
      },
      {
        cx: '8%',
        cy: '92%',
        rx: '86%',
        ry: '68%',
        stops: buildSevenStops('#3DC8FF', '#1951FC', '#041447', '#020307', 0.78),
      },
      {
        cx: '76%',
        cy: '72%',
        rx: '95%',
        ry: '72%',
        stops: buildSevenStops('#1951FC', '#0043EE', '#020307', '#020307', 0.44),
      },
    ],
    accentColor: '#3DC8FF',
    hairlineColor: 'rgba(255, 255, 255, 0.14)',
  },

  // Focus (Midnight Ice Sweep): #02040A obsidian + #0B2CB1 ultramarine + #6FA4FF / #CBE9FD luminous edge
  focus: {
    baseBg: '#02040A',
    washColors: ['#02040A', 'rgba(11, 44, 177, 0.14)', '#02040A'],
    washLocations: [0, 0.48, 1],
    blooms: [
      {
        cx: '84%',
        cy: '24%',
        rx: '90%',
        ry: '70%',
        stops: buildSevenStops('#0B2CB1', '#071D75', '#030B2E', '#02040A', 0.95),
      },
      {
        cx: '92%',
        cy: '14%',
        rx: '65%',
        ry: '52%',
        stops: buildSevenStops('#CBE9FD', '#6FA4FF', '#0B2CB1', '#02040A', 0.85),
      },
      {
        cx: '46%',
        cy: '42%',
        rx: '78%',
        ry: '50%',
        stops: buildSevenStops('#1951FC', '#0B2CB1', '#02040A', '#02040A', 0.45),
      },
    ],
    accentColor: '#CBE9FD',
    hairlineColor: 'rgba(203, 233, 253, 0.16)',
  },

  // Tasks (Toxin Amber Sweep): #050302 pitch espresso + #9A3412 burnt sienna + #FFAC38 amber-gold core
  tasks: {
    baseBg: '#050302',
    washColors: ['#050302', 'rgba(154, 52, 18, 0.14)', '#050302'],
    washLocations: [0, 0.52, 1],
    blooms: [
      {
        cx: '14%',
        cy: '24%',
        rx: '86%',
        ry: '68%',
        stops: buildSevenStops('#9A3412', '#6B210B', '#290B04', '#050302', 0.95),
      },
      {
        cx: '8%',
        cy: '16%',
        rx: '66%',
        ry: '50%',
        stops: buildSevenStops('#FFAC38', '#D9531E', '#7C2D12', '#050302', 0.88),
      },
      {
        cx: '42%',
        cy: '48%',
        rx: '72%',
        ry: '48%',
        stops: buildSevenStops('#D9531E', '#7C2D12', '#050302', '#050302', 0.42),
      },
    ],
    accentColor: '#FFAC38',
    hairlineColor: 'rgba(255, 172, 56, 0.18)',
  },

  // Habits (Nature Emerald-Teal Sweep): #020605 black-forest + #078ECF teal-blue + #80ECBF / #D6B75D core
  habits: {
    baseBg: '#020605',
    washColors: ['#020605', 'rgba(7, 142, 207, 0.12)', '#020605'],
    washLocations: [0, 0.5, 1],
    blooms: [
      {
        cx: '82%',
        cy: '76%',
        rx: '90%',
        ry: '72%',
        stops: buildSevenStops('#078ECF', '#065F46', '#03291F', '#020605', 0.92),
      },
      {
        cx: '88%',
        cy: '86%',
        rx: '66%',
        ry: '52%',
        stops: buildSevenStops('#80ECBF', '#0D9488', '#064E3B', '#020605', 0.82),
      },
      {
        cx: '58%',
        cy: '60%',
        rx: '64%',
        ry: '44%',
        stops: buildSevenStops('#D6B75D', '#0D9488', '#020605', '#020605', 0.36),
      },
    ],
    accentColor: '#80ECBF',
    hairlineColor: 'rgba(128, 236, 191, 0.18)',
  },

  // Voice & AI (Twilight Violet-Magenta-Blue Sweep): #040208 obsidian + #6D28D9 violet + #FF48E2 / #BBDBFF
  voice_ai: {
    baseBg: '#040208',
    washColors: ['#040208', 'rgba(109, 40, 217, 0.14)', '#040208'],
    washLocations: [0, 0.5, 1],
    blooms: [
      {
        cx: '20%',
        cy: '22%',
        rx: '88%',
        ry: '68%',
        stops: buildSevenStops('#6D28D9', '#4C1D95', '#1E0B47', '#040208', 0.95),
      },
      {
        cx: '12%',
        cy: '14%',
        rx: '64%',
        ry: '50%',
        stops: buildSevenStops('#FF48E2', '#9333EA', '#4C1D95', '#040208', 0.78),
      },
      {
        cx: '54%',
        cy: '42%',
        rx: '70%',
        ry: '46%',
        stops: buildSevenStops('#BBDBFF', '#6D28D9', '#040208', '#040208', 0.36),
      },
    ],
    accentColor: '#BBDBFF',
    hairlineColor: 'rgba(187, 219, 255, 0.18)',
  },

  // Distraction Shield (Negative Crimson-Rose-Teal Sweep): #050204 black + #BE123C crimson + #14B8A6 / #FFAB9D
  blocker: {
    baseBg: '#050204',
    washColors: ['#050204', 'rgba(190, 18, 60, 0.12)', '#050204'],
    washLocations: [0, 0.52, 1],
    blooms: [
      {
        cx: '16%',
        cy: '78%',
        rx: '84%',
        ry: '66%',
        stops: buildSevenStops('#BE123C', '#881337', '#3B0718', '#050204', 0.92),
      },
      {
        cx: '10%',
        cy: '88%',
        rx: '58%',
        ry: '46%',
        stops: buildSevenStops('#FFAB9D', '#BE123C', '#4C0519', '#050204', 0.76),
      },
      {
        cx: '86%',
        cy: '22%',
        rx: '72%',
        ry: '52%',
        stops: buildSevenStops('#14B8A6', '#0F766E', '#042F2E', '#050204', 0.68),
      },
    ],
    accentColor: '#FFAB9D',
    hairlineColor: 'rgba(255, 171, 157, 0.18)',
  },
};

const VICTORY_AURORA_CONFIG: Record<
  WrappedArchetypeKey,
  { c1: string; c2: string; c3: string; accent: string; base: string }
> = {
  iron_willed_sentinel: { c1: '#BE123C', c2: '#14B8A6', c3: '#FFAB9D', accent: '#FFAB9D', base: '#050204' },
  verbal_architect: { c1: '#6D28D9', c2: '#FF48E2', c3: '#BBDBFF', accent: '#BBDBFF', base: '#040208' },
  deep_work_monolith: { c1: '#0043EE', c2: '#0B2CB1', c3: '#3DC8FF', accent: '#3DC8FF', base: '#020307' },
  relentless_streaksmith: { c1: '#065F46', c2: '#078ECF', c3: '#80ECBF', accent: '#80ECBF', base: '#020605' },
  avalanche_finisher: { c1: '#9A3412', c2: '#D9531E', c3: '#FFAC38', accent: '#FFAC38', base: '#050302' },
  rhythm_weaver: { c1: '#312E81', c2: '#0043EE', c3: '#80ECBF', accent: '#80ECBF', base: '#020307' },
};

export function getVictoryPosterTheme(archetypeKey: WrappedArchetypeKey): WrappedPosterTheme {
  const cfg = VICTORY_AURORA_CONFIG[archetypeKey] || VICTORY_AURORA_CONFIG.rhythm_weaver;
  return {
    baseBg: cfg.base,
    washColors: [cfg.base, `${cfg.c1}22`, cfg.base],
    washLocations: [0, 0.5, 1],
    blooms: [
      {
        cx: '20%',
        cy: '78%',
        rx: '92%',
        ry: '72%',
        stops: buildSevenStops(cfg.c1, cfg.c2, cfg.base, cfg.base, 0.94),
      },
      {
        cx: '12%',
        cy: '88%',
        rx: '68%',
        ry: '54%',
        stops: buildSevenStops(cfg.c3, cfg.c1, cfg.base, cfg.base, 0.84),
      },
      {
        cx: '86%',
        cy: '20%',
        rx: '72%',
        ry: '52%',
        stops: buildSevenStops(cfg.c2, cfg.c1, cfg.base, cfg.base, 0.56),
      },
    ],
    accentColor: cfg.accent,
    hairlineColor: 'rgba(255, 255, 255, 0.16)',
  };
}
