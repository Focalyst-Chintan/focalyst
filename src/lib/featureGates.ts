export type UserPlan = 'free' | 'pro' | 'lifetime' | 'pro_monthly' | 'pro_yearly' | string

export const FREE_TIER_LIMITS = {
    habits: 2,
    pomodoroPresets: 4,
    countdowns: 1,
    notes: 5,
    aiMessagesPerDay: 5,
} as const

export function isFreePlan(plan?: UserPlan | null, expiresAt?: string | null) {
    if (!plan || plan === 'free') return true;
    if (plan === 'lifetime') return false;
    if (expiresAt && new Date(expiresAt) < new Date()) return true;
    return false;
}

export function isPaidPlan(plan?: UserPlan | null, expiresAt?: string | null) {
    return !isFreePlan(plan, expiresAt);
}

export function localDateKey(date = new Date()) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function dateKeyFromSupabase(value?: string | null) {
    if (!value) return null
    return localDateKey(new Date(value))
}
