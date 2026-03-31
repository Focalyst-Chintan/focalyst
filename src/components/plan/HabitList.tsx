'use client'

import { useRouter } from 'next/navigation'
import { usePlan } from '@/context/PlanContext'
import TaskMenu from './TaskMenu'
import LoadingSkeleton, { ErrorCard } from './LoadingSkeleton'
import HabitRow from './HabitRow'

export default function HabitList() {
    const { habits, loading, error, updateHabit, deleteHabit, refreshData } = usePlan()
    const router = useRouter()

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

    return (
        <section>
            <h2 className="text-navy text-lg font-semibold mb-3">My Habits</h2>

            {/* Loading skeleton */}
            {loading && <LoadingSkeleton rows={2} type="habit" />}

            {/* Error state */}
            {!loading && error && <ErrorCard message={error} onRetry={refreshData} />}

            {/* Habit list */}
            {!loading && (
                <div className="flex flex-col gap-2">
                    {habits.length === 0 ? (
                        <p className="text-blue-muted text-sm py-4 text-center">
                            No habits yet. Start building your routine.
                        </p>
                    ) : (
                        habits.map((habit) => (
                            <HabitRow
                                key={habit.id}
                                habit={habit}
                                onToggle={() => toggleHabit(habit.id)}
                                onEdit={() => router.push(`/plan/edit-habit/${habit.id}`)}
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
                className="w-full h-11 bg-accent text-white text-sm font-semibold rounded-xl mt-3 transition-all active:scale-[0.98] hover:bg-accent-dark"
            >
                + Add new habit
            </button>
        </section>
    )
}
