'use client'

import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { usePlan } from '@/context/PlanContext'
import LoadingSkeleton, { ErrorCard } from './LoadingSkeleton'
import HabitRow from './HabitRow'
import { Plus } from 'lucide-react'

export default function HabitList() {
    const { habits, loading, error, updateHabit, deleteHabit, refreshData } = usePlan()
    const router = useRouter()
    const { t } = useTranslation()

    const toggleHabit = (id: string) => {
        const habit = habits.find((h) => h.id === id)
        if (habit) updateHabit(id, { completed_today: !habit.completed_today })
    }

    const handleRename = (id: string) => {
        const habit = habits.find((h) => h.id === id)
        if (!habit) return
        const newName = prompt('Rename habit:', habit.name)
        if (newName && newName.trim()) {
            updateHabit(id, { name: newName.trim() })
        }
    }

    // Clean localization of Supabase fetch error
    const translatedError = error === 'Could not load your data. Showing sample data.'
        ? t('plan.errorLoading')
        : error

    return (
        <section>
            <h2 className="m-overline text-ink-2 mb-2">{t('plan.habits')}</h2>

            {/* Loading skeleton */}
            {loading && <LoadingSkeleton rows={2} type="habit" />}

            {/* Error state */}
            {!loading && error && <ErrorCard message={translatedError || ''} onRetry={refreshData} />}

            {/* Habit list */}
            {!loading && (
                <div className="flex flex-col gap-2">
                    {habits.length === 0 ? (
                        <p className="m-footnote text-ink-2 py-1">
                            {t('plan.noHabits')}
                        </p>
                    ) : (
                        habits.map((habit) => (
                            <HabitRow
                                key={habit.id}
                                habit={habit}
                                onToggle={() => toggleHabit(habit.id)}
                                onEdit={() => router.push(`/plan/edit-habit?id=${habit.id}`)}
                                onDelete={() => deleteHabit(habit.id)}
                                onRename={() => handleRename(habit.id)}
                            />
                        ))
                    )}
                </div>
            )}

            {/* Add habit button */}
            <button
                onClick={() => router.push('/plan/new-habit')}
                className="m-add-row m-press mt-2"
            >
                <Plus size={18} strokeWidth={1.75} aria-hidden />
                {t('plan.addHabit')}
            </button>
        </section>
    )
}
