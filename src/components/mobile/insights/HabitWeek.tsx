'use client'

import { usePlan } from '@/context/PlanContext'
import { addDaysYMD, localDateStr } from '@/lib/utils/date'
import { getStartAndEndOfWeek } from '@/lib/utils/insights'
import { GlassCard, StreakChip, WeekStrip, type WeekDay } from '@/components/mobile/ui'
import { AnimatedNumber } from './AnimatedNumber'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Display only. Reads the habits the Plan context has already loaded (completedDates);
// no new query. A day counts as done when every habit scheduled that day (repeat_days,
// 0 = Monday, as in the habit form) has it in completedDates.
export function useHabitWeek(): WeekDay[] | null {
    const { habits } = usePlan()
    if (!habits || habits.length === 0) return null
    const today = localDateStr()
    const monday = localDateStr(getStartAndEndOfWeek(new Date()).startOfWeek)
    return DAY_NAMES.map((name, i) => {
        const ymd = addDaysYMD(monday, i)
        const due = habits.filter((h) => h.all_days || (h.repeat_days || []).includes(i))
        const allDone = due.length > 0 && due.every((h) => (h.completedDates || []).includes(ymd))
        const state = allDone ? 'done' : ymd > today || due.length === 0 ? 'future' : 'missed'
        return {
            key: ymd,
            initial: name.charAt(0),
            date: Number(ymd.slice(8, 10)),
            state,
            isToday: ymd === today,
            label: `${name}, ${state === 'done' ? 'all habits done' : due.length === 0 ? 'no habits due' : state === 'future' ? 'coming up' : 'not all habits done'}`,
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
                <h3 className="m-overline text-ink-2">This week</h3>
                {bestStreak > 0 && <StreakChip className="!h-6 !text-[12px]">{bestStreak} {bestStreak === 1 ? 'day' : 'days'}</StreakChip>}
            </div>
            <WeekStrip days={days} />
        </GlassCard>
    )
}

// Best streak tile (spec 10.6 item 4): the longest current habit streak.
export function BestStreakTile({ bestStreak }: { bestStreak: number }) {
    return (
        <GlassCard size="md" className="p-4 flex flex-col justify-between min-h-[132px]">
            <h3 className="m-footnote text-ink-2">Best streak</h3>
            <div>
                <p className="flex items-baseline gap-1.5">
                    <span className="m-stat-l text-ink">
                        <AnimatedNumber metric="streak:best" value={bestStreak} label={`${bestStreak} days`} render={(n) => n} />
                    </span>
                    <span className="m-subhead text-ink-2">{bestStreak === 1 ? 'day' : 'days'}</span>
                </p>
                <p className="m-caption text-ink-2 mt-1">Longest current habit streak</p>
            </div>
        </GlassCard>
    )
}
