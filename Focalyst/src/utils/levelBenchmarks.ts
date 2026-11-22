export interface LevelBenchmark {
  level: number;
  title: string;
  xp: number;
}

export const LEVEL_BENCHMARKS: LevelBenchmark[] = [
  { level: 1, title: 'Ignition', xp: 0 },
  { level: 2, title: 'Momentum', xp: 100 },
  { level: 3, title: 'Builder', xp: 300 },
  { level: 4, title: 'Practitioner', xp: 700 },
  { level: 5, title: 'Disciplined', xp: 1400 },
  { level: 6, title: 'Focused', xp: 2500 },
  { level: 7, title: 'Flow', xp: 4000 },
  { level: 8, title: 'Operator', xp: 6500 },
  { level: 9, title: 'Achiever', xp: 9500 },
  { level: 10, title: 'Strategist', xp: 13500 },
  { level: 11, title: 'Mastery', xp: 19000 },
  { level: 12, title: 'Elite', xp: 26000 },
  { level: 13, title: 'Apex', xp: 36000 },
  { level: 14, title: 'Legend', xp: 50000 },
  { level: 15, title: 'Limitless', xp: 70000 },
];

/**
 * Derives current_level and current_title from a given total XP value.
 */
export function getLevelFromXP(totalXp: number): { level: number; title: string } {
  let result = LEVEL_BENCHMARKS[0];
  for (let i = LEVEL_BENCHMARKS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_BENCHMARKS[i].xp) {
      result = LEVEL_BENCHMARKS[i];
      break;
    }
  }
  return { level: result.level, title: result.title };
}
