export interface LevelBenchmark {
  level: number;
  title: string;
  xp: number;
}

export const LEVELS: LevelBenchmark[] = [
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

export interface LevelInfo {
  level: number;
  title: string;
  floorXp: number;
  nextXp: number;
  nextLevel: number;
  nextTitle: string;
  progress: number; // 0..1 (same as mobile bar: xpIntoLevel / xpRequiredForNext)
  remaining: number; // nextXp - totalXp
}

/**
 * Derives exact level info matching the mobile app:
 * Same 15 levels, same progress maths (xpIntoLevel / xpRequiredForNext),
 * same floorXp, nextXp, and remaining.
 */
export function getLevelFromXp(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(Number(totalXp) || 0));

  let currentIndex = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (safeXp >= LEVELS[i].xp) {
      currentIndex = i;
      break;
    }
  }

  const current = LEVELS[currentIndex];
  const nextIndex = Math.min(LEVELS.length - 1, currentIndex + 1);
  const next = LEVELS[nextIndex];

  const floorXp = current.xp;
  const nextXp = next.xp;
  const xpIntoLevel = safeXp - floorXp;
  const xpRequiredForNext = Math.max(1, nextXp - floorXp);

  // If at max level (15), progress is 1 and remaining is 0
  const isMaxLevel = current.level === LEVELS[LEVELS.length - 1].level;
  const progress = isMaxLevel ? 1 : Math.min(1, Math.max(0, xpIntoLevel / xpRequiredForNext));
  const remaining = isMaxLevel ? 0 : Math.max(0, nextXp - safeXp);

  return {
    level: current.level,
    title: current.title,
    floorXp,
    nextXp,
    nextLevel: next.level,
    nextTitle: next.title,
    progress,
    remaining,
  };
}
