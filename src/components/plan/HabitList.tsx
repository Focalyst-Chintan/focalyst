'use client'

import { useState } from 'react'
import TaskMenu from './TaskMenu'

interface HabitItem {
    id: string
    name: string
    current_streak: number
    completed_today: boolean
}

interface HabitListProps {
    onAddHabit: () => void
}

// Mock data for UI — will be replaced with Supabase queries
const MOCK_HABITS: HabitItem[] = [
    { id: '1', name: 'Morning walk', current_streak: 3, completed_today: false },
    { id: '2', name: 'Gym', current_streak: 5, completed_today: false },
]

export default function HabitList({ onAddHabit }: HabitListProps) {
    const [habits, setHabits] = useState<HabitItem[]>(MOCK_HABITS)

    const toggleHabit = (id: string) => {
        setHabits((prev) =>
            prev.map((h) =>
                h.id === id ? { ...h, completed_today: !h.completed_today } : h
            )
        )
    }

    const deleteHabit = (id: string) => {
        setHabits((prev) => prev.filter((h) => h.id !== id))
    }

    const renameHabit = (id: string) => {
        const habit = habits.find((h) => h.id === id)
        if (!habit) return
        const newName = prompt('Rename habit:', habit.name)
        if (newName && newName.trim()) {
            setHabits((prev) =>
                prev.map((h) => (h.id === id ? { ...h, name: newName.trim() } : h))
            )
        }
    }

    return (
        <section>
            <h2 className="text-navy text-lg font-semibold mb-3">My Habits</h2>

            <div className="flex flex-col gap-2">
                {habits.map((habit) => (
                    <div
                        key={habit.id}
                        className="flex items-center gap-3 bg-card-bg rounded-xl px-3 py-3"
                    >
                        {/* Checkbox */}
                        <button
                            onClick={() => toggleHabit(habit.id)}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${habit.completed_today
                                    ? 'bg-navy border-navy'
                                    : 'border-blue-muted bg-white'
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
                        <span
                            className={`flex-1 text-sm font-medium transition-all ${habit.completed_today
                                    ? 'text-blue-muted line-through'
                                    : 'text-navy-darker'
                                }`}
                        >
                            {habit.name}
                        </span>

                        {/* Streak badge */}
                        <span className="text-blue-muted text-xs font-medium whitespace-nowrap">
                            Streak {habit.current_streak} days
                        </span>

                        {/* Menu */}
                        <TaskMenu
                            onDelete={() => deleteHabit(habit.id)}
                            onRename={() => renameHabit(habit.id)}
                            onTag={() => console.log('Tag habit:', habit.id)}
                        />
                    </div>
                ))}
            </div>

            {/* Add habit button */}
            <button
                onClick={onAddHabit}
                className="w-full h-11 bg-accent text-white text-sm font-semibold rounded-xl mt-3 transition-all active:scale-[0.98] hover:bg-accent-dark"
            >
                + Add new habit
            </button>
        </section>
    )
}
