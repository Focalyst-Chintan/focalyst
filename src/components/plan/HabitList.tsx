'use client'

import { useRouter } from 'next/navigation'
import { usePlan } from '@/context/PlanContext'
import TaskMenu from './TaskMenu'
import LoadingSkeleton, { ErrorCard } from './LoadingSkeleton'

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
                            <div
                                key={habit.id}
                                className="flex items-center gap-3 bg-card-bg rounded-xl px-3 py-3"
                            >
                                {/* Checkbox */}
                                <button
                                    onClick={() => toggleHabit(habit.id)}
                                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${habit.completed_today ? 'bg-navy border-navy' : 'border-blue-muted bg-white'
                                        }`}
                                    aria-label={habit.completed_today ? 'Unmark habit' : 'Complete habit'}
                                >
                                    {habit.completed_today && (
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                            <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>

                                {/* Name */}
                                <span className={`flex-1 text-sm font-medium transition-all ${habit.completed_today ? 'text-blue-muted line-through' : 'text-navy'
                                    }`}>
                                    {habit.name}
                                </span>

                                {/* Streak badge */}
                                <span className="text-blue-muted text-xs font-medium whitespace-nowrap">
                                    Streak {habit.current_streak} days
                                </span>

                                {/* Menu */}
                                <TaskMenu
                                    onEdit={() => router.push(`/plan/edit-habit/${habit.id}`)}
                                    onDelete={() => deleteHabit(habit.id)}
                                    onRename={() => handleRename(habit.id)}
                                    onTag={() => console.log('Tag habit:', habit.id)}
                                />
                            </div>
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
