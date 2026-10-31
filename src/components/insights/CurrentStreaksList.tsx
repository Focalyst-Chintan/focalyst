'use client'

import { useTranslation } from 'react-i18next'

interface StreakHabit {
    id: string;
    name: string;
    icon: string;
    current_streak: number;
}

export function CurrentStreaksList({ habits }: { habits: StreakHabit[] }) {
    const { t } = useTranslation()

    if (habits.length === 0) {
        return (
            <div className="mt-3">
                <h3 className="m-overline text-ink-2 mb-3">{t('insights.activeHabits')}</h3>
                <div className="m-glass p-6 text-center">
                    <p className="m-footnote text-ink-2">{t('insights.activeHabitsEmpty')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-3">
            <h3 className="m-overline text-ink-2 mb-3">{t('insights.activeHabits')}</h3>

            <div className="grid grid-cols-2 gap-3">
                {habits.slice(0, 4).map((habit) => (
                    <div key={habit.id} className="m-glass m-glass-md p-5 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-[var(--m-surface-strong)] border border-line flex items-center justify-center text-[24px] mb-3">
                            {habit.icon}
                        </div>
                        <h4 className="m-callout !font-semibold text-ink leading-tight">{habit.name}</h4>
                        <p className="m-caption text-ink-2 mt-1 m-num">{t('plan.totalDays', { count: habit.current_streak })}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
