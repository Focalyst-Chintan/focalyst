// Shared mapping between the `reminders` table (phone format: `day`, 'Daily'/'Custom',
// `custom_every` + `custom_unit`) and the mobile-web calendar's ReminderItem shape
// (`date`, 'daily'/'custom', `custom_interval` + `custom_frequency`).

type WebRepeat = 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
type WebFrequency = 'day' | 'week' | 'month' | 'year'

const REPEAT_TO_DB: Record<WebRepeat, string> = {
    never: 'Never',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    custom: 'Custom',
}

const FREQUENCY_TO_DB: Record<WebFrequency, string> = {
    day: 'Daily',
    week: 'Weekly',
    month: 'Monthly',
    year: 'Yearly',
}

export function toDbRepeat(repeat: string): string {
    return REPEAT_TO_DB[repeat as WebRepeat] || 'Never'
}

export function toDbCustomUnit(freq: string): string {
    return FREQUENCY_TO_DB[freq as WebFrequency] || 'Daily'
}

function toWebRepeat(raw: unknown): string {
    const r = String(raw || 'never').toLowerCase()
    if (r === 'every day' || r === 'daily') return 'daily'
    if (r === 'every week' || r === 'weekly') return 'weekly'
    if (r === 'every month' || r === 'monthly') return 'monthly'
    if (r === 'every year' || r === 'yearly') return 'yearly'
    if (r === 'custom') return 'custom'
    // 'Every 2 Weeks' (phone/desktop only) is equivalent to a custom 2-week repeat
    if (r === 'every 2 weeks') return 'custom'
    return 'never'
}

function toWebFrequency(raw: unknown): WebFrequency {
    const f = String(raw || '').toLowerCase()
    if (f.startsWith('week')) return 'week'
    if (f.startsWith('month')) return 'month'
    if (f.startsWith('year')) return 'year'
    return 'day'
}

export function normalizeReminderRow(row: any) {
    const rawRepeat = row.repeat || row.repeat_mode
    const isEvery2Weeks = String(rawRepeat || '').toLowerCase() === 'every 2 weeks'
    return {
        ...row,
        date: String(row.day || row.date || '').slice(0, 10),
        repeat: toWebRepeat(rawRepeat),
        custom_interval: isEvery2Weeks
            ? 2
            : Math.max(1, Number(row.custom_every || row.custom_repeat_every || row.custom_interval || 1)),
        custom_frequency: isEvery2Weeks
            ? 'week'
            : toWebFrequency(row.custom_unit || row.custom_repeat_frequency || row.custom_frequency),
        tag: row.tag || row.category,
    }
}

export function normalizeReminderRows(rows: any[] | null | undefined) {
    return (rows || []).map(normalizeReminderRow)
}
