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
            <div className="mt-8">
                <h3 className="text-[18px] font-semibold text-navy dark:text-slate-100 mb-4">{t('insights.activeHabits')}</h3>
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm text-center border dark:border-slate-800">
                    <p className="text-[14px] text-blue-muted dark:text-slate-400">{t('insights.activeHabitsEmpty')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-8">
            <h3 className="text-[18px] font-semibold text-navy dark:text-slate-100 mb-4">{t('insights.activeHabits')}</h3>

            <div className="grid grid-cols-2 gap-4">
                {habits.slice(0, 4).map((habit) => (
                    <div key={habit.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm flex flex-col items-center text-center border dark:border-slate-800">
                        <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-slate-800 flex items-center justify-center text-[24px] mb-3">
                            {habit.icon}
                        </div>
                        <h4 className="text-[15px] font-semibold text-navy dark:text-slate-200 leading-tight">{habit.name}</h4>
                        <p className="text-[12px] text-blue-muted dark:text-slate-400 mt-1">{t('plan.totalDays', { count: habit.current_streak })}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
