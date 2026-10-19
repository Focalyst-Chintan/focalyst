export interface LevelBenchmark {
    level: number
    title: string
    xp: number
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
]

export interface LevelState {
    current: LevelBenchmark
    next: LevelBenchmark
    progress: number // 0–100
    totalXP: number
    xpRemaining: number
}

export function getLevelFromXP(totalXP: number): LevelState {
    let current = LEVEL_BENCHMARKS[0]
    for (let i = LEVEL_BENCHMARKS.length - 1; i >= 0; i--) {
        if (totalXP >= LEVEL_BENCHMARKS[i].xp) {
            current = LEVEL_BENCHMARKS[i]
            break
        }
    }

    const nextIndex = LEVEL_BENCHMARKS.findIndex(l => l.level === current.level) + 1
    const next = nextIndex < LEVEL_BENCHMARKS.length ? LEVEL_BENCHMARKS[nextIndex] : LEVEL_BENCHMARKS[LEVEL_BENCHMARKS.length - 1]

    const xpIntoLevel = Math.max(0, totalXP - current.xp)
    const xpRequiredForNext = Math.max(1, next.xp - current.xp)
    const progress = current.level === 15 
        ? 100 
        : Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpRequiredForNext) * 100)))
    const xpRemaining = Math.max(0, next.xp - totalXP)

    return {
        current,
        next,
        progress,
        totalXP,
        xpRemaining,
    }
}

export function getLevelFromMinutes(totalMinutes: number): number {
    // 1 focus minute = 10 XP
    const state = getLevelFromXP(totalMinutes * 10);
    return state.current.level;
}
