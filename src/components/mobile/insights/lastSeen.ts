'use client'

// UI-only memory of the Insights numbers the user last saw (spec 9.4).
// A map from "metric:period" to value, kept in memory and in localStorage.
// Read and write are wrapped in try/catch; without storage it behaves as a first visit
// that never repeats in the same session.
const KEY = 'insights:lastSeen:v1'

let cache: Record<string, number> | null = null

function load(): Record<string, number> {
    if (cache) return cache
    cache = {}
    try {
        const raw = window.localStorage.getItem(KEY)
        const parsed = raw ? JSON.parse(raw) : null
        if (parsed && typeof parsed === 'object') {
            for (const [k, v] of Object.entries(parsed)) {
                if (typeof v === 'number' && Number.isFinite(v)) cache[k] = v
            }
        }
    } catch {
        // storage blocked or corrupt: start empty
    }
    return cache
}

export function getLastSeen(metric: string): number | undefined {
    if (typeof window === 'undefined') return undefined
    return load()[metric]
}

export function markSeen(metric: string, value: number): void {
    if (typeof window === 'undefined') return
    const map = load()
    if (map[metric] === value) return
    map[metric] = value
    try {
        window.localStorage.setItem(KEY, JSON.stringify(map))
    } catch {
        // storage blocked: the in-memory value still prevents a replay this session
    }
}

// Where a count-up starts: 0 the first time ever, the last seen value when it changed,
// or null when the value is unchanged (no animation).
export function countUpStart(metric: string, value: number): number | null {
    const last = getLastSeen(metric)
    if (last === undefined) return value === 0 ? null : 0
    return last === value ? null : last
}
