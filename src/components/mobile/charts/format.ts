// Display helpers for durations. Minutes in, "41h 54m" out.
export function hm(totalMinutes: number): { h: number; m: number } {
    const mins = Math.max(0, Math.round(totalMinutes))
    return { h: Math.floor(mins / 60), m: mins % 60 }
}

export function hmText(totalMinutes: number): string {
    const { h, m } = hm(totalMinutes)
    if (h === 0) return `${m}m`
    return `${h}h ${m}m`
}

export function hmSpoken(totalMinutes: number): string {
    const { h, m } = hm(totalMinutes)
    const hs = `${h} ${h === 1 ? 'hour' : 'hours'}`
    const ms = `${m} ${m === 1 ? 'minute' : 'minutes'}`
    return h === 0 ? ms : `${hs} ${ms}`
}
