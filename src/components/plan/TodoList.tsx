'use client'

import { useState } from 'react'
import TaskMenu from './TaskMenu'

interface TaskItem {
    id: string
    title: string
    is_completed: boolean
}

interface TodoListProps {
    onAddTask: () => void
}

// Mock data for UI — will be replaced with Supabase queries
const MOCK_TASKS: TaskItem[] = [
    { id: '1', title: 'Study Thermodynamics', is_completed: false },
    { id: '2', title: 'Solve PYQ', is_completed: false },
    { id: '3', title: 'Buy notebooks', is_completed: false },
]

export default function TodoList({ onAddTask }: TodoListProps) {
    const [tasks, setTasks] = useState<TaskItem[]>(MOCK_TASKS)

    const toggleTask = (id: string) => {
        setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, is_completed: !t.is_completed } : t))
        )
    }

    const deleteTask = (id: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== id))
    }

    const renameTask = (id: string) => {
        const task = tasks.find((t) => t.id === id)
        if (!task) return
        const newTitle = prompt('Rename task:', task.title)
        if (newTitle && newTitle.trim()) {
            setTasks((prev) =>
                prev.map((t) => (t.id === id ? { ...t, title: newTitle.trim() } : t))
            )
        }
    }

    return (
        <section>
            <h2 className="text-navy text-lg font-semibold mb-3">TO-DO List</h2>

            <div className="flex flex-col gap-2">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className="flex items-center gap-3 bg-card-bg rounded-xl px-3 py-3"
                    >
                        {/* Checkbox */}
                        <button
                            onClick={() => toggleTask(task.id)}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${task.is_completed
                                    ? 'bg-navy border-navy'
                                    : 'border-blue-muted bg-white'
                                }`}
                            aria-label={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
                        >
                            {task.is_completed && (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </button>

                        {/* Title */}
                        <span
                            className={`flex-1 text-sm font-medium transition-all ${task.is_completed
                                    ? 'text-blue-muted line-through'
                                    : 'text-navy-darker'
                                }`}
                        >
                            {task.title}
                        </span>

                        {/* Menu */}
                        <TaskMenu
                            onDelete={() => deleteTask(task.id)}
                            onRename={() => renameTask(task.id)}
                            onTag={() => console.log('Tag task:', task.id)}
                        />
                    </div>
                ))}
            </div>

            {/* Add task button */}
            <button
                onClick={onAddTask}
                className="w-full h-11 bg-accent text-white text-sm font-semibold rounded-xl mt-3 transition-all active:scale-[0.98] hover:bg-accent-dark"
            >
                + Add new task
            </button>
        </section>
    )
}
