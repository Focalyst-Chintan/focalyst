export interface LevelDefinition {
    level: number
    name: string
    thresholdMinutes: number
    color: string
    colorLight: string
    gradient: string
}

export const LEVELS: LevelDefinition[] = [
    { level: 1,  name: 'Ignition',     thresholdMinutes: 0,     color: '#9CA3AF', colorLight: '#F3F4F6', gradient: 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)' },
    { level: 2,  name: 'Momentum',     thresholdMinutes: 120,   color: '#38BDF8', colorLight: '#E0F2FE', gradient: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)' },
    { level: 3,  name: 'Builder',      thresholdMinutes: 300,   color: '#2DD4BF', colorLight: '#CCFBF1', gradient: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' },
    { level: 4,  name: 'Practitioner', thresholdMinutes: 600,   color: '#34D399', colorLight: '#D1FAE5', gradient: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)' },
    { level: 5,  name: 'Disciplined',  thresholdMinutes: 1200,  color: '#A3E635', colorLight: '#ECFCCB', gradient: 'linear-gradient(135deg, #A3E635 0%, #84CC16 100%)' },
    { level: 6,  name: 'Focused',      thresholdMinutes: 2100,  color: '#FACC15', colorLight: '#FEF9C3', gradient: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)' },
    { level: 7,  name: 'Flow',         thresholdMinutes: 3000,  color: '#FB923C', colorLight: '#FFEDD5', gradient: 'linear-gradient(135deg, #FB923C 0%, #F97316 100%)' },
    { level: 8,  name: 'Operator',     thresholdMinutes: 4500,  color: '#EA580C', colorLight: '#FFF7ED', gradient: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)' },
    { level: 9,  name: 'Achiever',     thresholdMinutes: 6000,  color: '#EF4444', colorLight: '#FEE2E2', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' },
    { level: 10, name: 'Strategist',   thresholdMinutes: 9000,  color: '#A855F7', colorLight: '#F3E8FF', gradient: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)' },
    { level: 11, name: 'Mastery',      thresholdMinutes: 12000, color: '#6366F1', colorLight: '#E0E7FF', gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' },
    { level: 12, name: 'Elite',        thresholdMinutes: 18000, color: '#2563EB', colorLight: '#DBEAFE', gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' },
    { level: 13, name: 'Apex',         thresholdMinutes: 30000, color: '#8B5CF6', colorLight: '#EDE9FE', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' },
    { level: 14, name: 'Legend',       thresholdMinutes: 45000, color: '#F59E0B', colorLight: '#FEF3C7', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
    { level: 15, name: 'Limitless',    thresholdMinutes: 60000, color: '#F59E0B', colorLight: '#FEF3C7', gradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%)' },
]

export interface LevelState {
    current: LevelDefinition
    next: LevelDefinition | null
    progress: number // 0–100
    totalMinutes: number
}

export function getLevelFromMinutes(totalMinutes: number): LevelState {
    let current = LEVELS[0]

    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (totalMinutes >= LEVELS[i].thresholdMinutes) {
            current = LEVELS[i]
            break
        }
    }

    const nextIndex = LEVELS.findIndex(l => l.level === current.level) + 1
    const next = nextIndex < LEVELS.length ? LEVELS[nextIndex] : null

    let progress = 100
    if (next) {
        const range = next.thresholdMinutes - current.thresholdMinutes
        const elapsed = totalMinutes - current.thresholdMinutes
        progress = Math.min(Math.round((elapsed / range) * 100), 100)
    }

    return { current, next, progress, totalMinutes }
}

export function formatFocusTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    if (h === 0) return `${m}m`
    return `${h}h ${m}m`
}

export function formatThresholdHours(minutes: number): string {
    const h = minutes / 60
    if (h === 0) return '0h'
    return `${h}h`
}
