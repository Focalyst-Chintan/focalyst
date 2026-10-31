'use client'

import { useTranslation } from 'react-i18next'
import { Repeat } from 'lucide-react'
import { usePlan } from '@/context/PlanContext'
import { addDaysYMD, localDateStr } from '@/lib/utils/date'
import { SectionHeader, StreakChip } from '@/components/mobile/ui'

interface StreakHabit {
    id: string;
    name: string;
    icon: string;
    current_streak: number;
    color?: string;
}

// Active habits as a snapping horizontal carousel (spec 10.6 item 6).
// The 7-day dots read completedDates the Plan context already has (display only).
export function CurrentStreaksList({ habits }: { habits: StreakHabit[] }) {
    const { t } = useTranslation()
    const { habits: planHabits } = usePlan()
    const today = localDateStr()
    const last7 = Array.from({ length: 7 }, (_, i) => addDaysYMD(today, i - 6))

    if (habits.length === 0) {
        return (
            <section>
                <SectionHeader label={t('insights.activeHabits')} />
                <div className="m-glass p-5 flex items-center gap-3">
                    <span className="m-tile text-primary-text"><Repeat size={20} strokeWidth={1.75} aria-hidden /></span>
                    <p className="m-footnote text-ink-2">{t('insights.activeHabitsEmpty')}</p>
                </div>
            </section>
        )
    }

    return (
        <section>
            <SectionHeader label={t('insights.activeHabits')} count={habits.length} />

            <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory fx-no-scrollbar -mx-5 px-5 pb-1 scroll-px-5">
                {habits.slice(0, 4).map((habit) => {
                    const done = new Set(planHabits.find((h) => h.id === habit.id)?.completedDates || [])
                    const tint = habit.color
                        ? { background: `color-mix(in srgb, ${habit.color} 16%, transparent)`, borderColor: `color-mix(in srgb, ${habit.color} 40%, transparent)` }
                        : undefined
                    return (
                        <li key={habit.id} className="m-glass m-glass-md snap-start shrink-0 w-40 p-4 flex flex-col">
                            <span className="m-tile text-[22px] leading-none" style={tint} aria-hidden>
                                {habit.icon}
                            </span>
                            <h4 className="m-headline text-ink mt-3 truncate">{habit.name}</h4>
                            <StreakChip className="mt-2 self-start !h-6 !text-[12px]">
                                {habit.current_streak} {habit.current_streak === 1 ? 'day' : 'days'}
                            </StreakChip>
                            <div className="flex gap-1 mt-3" aria-label={`Last 7 days: ${last7.filter((d) => done.has(d)).length} done`}>
                                {last7.map((d) => (
                                    <span
                                        key={d}
                                        aria-hidden
                                        className={`flex-1 h-1.5 rounded-full ${done.has(d) ? 'bg-primary' : 'bg-[var(--m-surface-strong)]'} ${d === today ? 'ring-1 ring-[var(--m-brand-400)]' : ''}`}
                                    />
                                ))}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
