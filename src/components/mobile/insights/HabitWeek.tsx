'use client'

import { usePlan } from '@/context/PlanContext'
import { addDaysYMD, localDateStr } from '@/lib/utils/date'
import { GlassCard, StreakChip, WeekStrip, type WeekDay } from '@/components/mobile/ui'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Display only. Reads the habits the Plan context has already loaded (completedDates);
// no new query. Same 7 days as the focus chart on this page (the last 7 days, today last),
// so the strip and the chart line up. A day counts as done when every habit scheduled
// that day (repeat_days, 0 = Monday, as in the habit form) has it in completedDates.
export function useHabitWeek(): WeekDay[] | null {
    const { habits } = usePlan()
    if (!habits || habits.length === 0) return null
    const today = localDateStr()
    return Array.from({ length: 7 }, (_, k) => {
        const ymd = addDaysYMD(today, k - 6)
        const jsDay = new Date(`${ymd}T12:00:00`).getDay()
        const mondayIndex = (jsDay + 6) % 7
        const name = DAY_NAMES[jsDay]
        const due = habits.filter((h) => h.all_days || (h.repeat_days || []).includes(mondayIndex))
        const allDone = due.length > 0 && due.every((h) => (h.completedDates || []).includes(ymd))
        const state = allDone ? 'done' : due.length === 0 ? 'future' : 'missed'
        return {
            key: ymd,
            initial: name.charAt(0),
            date: Number(ymd.slice(8, 10)),
            state,
            isToday: ymd === today,
            label: `${name}, ${state === 'done' ? 'all habits done' : due.length === 0 ? 'no habits due' : 'not all habits done'}`,
        }
    })
}

// "This week" habit strip (spec 10.6 item 3) with the longest current streak on the right.
export function HabitWeekCard({ bestStreak }: { bestStreak: number }) {
    const days = useHabitWeek()
    if (!days) return null
    return (
        <GlassCard className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="m-overline text-ink-2">Last 7 days</h3>
                {bestStreak > 0 && <StreakChip className="!h-6 !text-[12px]">{bestStreak} {bestStreak === 1 ? 'day' : 'days'}</StreakChip>}
            </div>
            <WeekStrip days={days} />
        </GlassCard>
    )
}
