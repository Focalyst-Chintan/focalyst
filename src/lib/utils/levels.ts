import { LEVELS, getLevelFromXp, type LevelBenchmark, type LevelInfo } from '@/lib/xp/levels';

export { LEVELS as LEVEL_BENCHMARKS };
export type { LevelBenchmark };

export interface LevelState {
  current: LevelBenchmark;
  next: LevelBenchmark;
  progress: number; // 0–100 for backwards compatibility with mobile-width web components
  totalXP: number;
  xpRemaining: number;
}

export function getLevelFromXP(totalXP: number): LevelState {
  const info = getLevelFromXp(totalXP);
  const current = LEVELS.find((l) => l.level === info.level) || LEVELS[0];
  const next = LEVELS.find((l) => l.level === info.nextLevel) || LEVELS[LEVELS.length - 1];

  return {
    current,
    next,
    progress: Math.round(info.progress * 100),
    totalXP: Math.max(0, Math.floor(Number(totalXP) || 0)),
    xpRemaining: info.remaining,
  };
}

export function getLevelFromMinutes(totalMinutes: number): number {
  // Backwards compatibility shim: 1 min = 10 XP
  return getLevelFromXp(totalMinutes * 10).level;
}
