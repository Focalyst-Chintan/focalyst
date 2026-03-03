'use client'

import { useState, useRef } from 'react'
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
    const dragItem = useRef<number | null>(null)
    const dragOverItem = useRef<number | null>(null)
    const [draggingIdx, setDraggingIdx] = useState<number | null>(null)

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

    // ── Drag handlers ──
    const handleDragStart = (index: number) => {
        dragItem.current = index
        setDraggingIdx(index)
    }

    const handleDragEnter = (index: number) => {
        dragOverItem.current = index
    }

    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null) {
            setDraggingIdx(null)
            return
        }
        const reordered = [...tasks]
        const [removed] = reordered.splice(dragItem.current, 1)
        reordered.splice(dragOverItem.current, 0, removed)
        setTasks(reordered)
        dragItem.current = null
        dragOverItem.current = null
        setDraggingIdx(null)
    }

    // ── Touch drag handlers for mobile ──
    const touchStartY = useRef<number>(0)
    const touchItemIdx = useRef<number | null>(null)

    const handleTouchStart = (index: number, e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY
        touchItemIdx.current = index
        dragItem.current = index
        setDraggingIdx(index)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchItemIdx.current === null) return
        const touchY = e.touches[0].clientY
        const taskElements = document.querySelectorAll('[data-task-row]')
        taskElements.forEach((el, idx) => {
            const rect = el.getBoundingClientRect()
            if (touchY >= rect.top && touchY <= rect.bottom) {
                dragOverItem.current = idx
            }
        })
    }

    const handleTouchEnd = () => {
        handleDragEnd()
        touchItemIdx.current = null
    }

    return (
        <section>
            <h2 className="text-navy text-lg font-semibold mb-3">TO-DO List</h2>

            <div className="flex flex-col gap-2">
                {tasks.map((task, index) => (
                    <div
                        key={task.id}
                        data-task-row
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        onTouchStart={(e) => handleTouchStart(index, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className={`flex items-center gap-3 bg-card-bg rounded-xl px-3 py-3 cursor-grab active:cursor-grabbing transition-all ${draggingIdx === index ? 'opacity-50 scale-[0.97]' : 'opacity-100'
                            }`}
                    >
                        {/* Drag handle */}
                        <div className="flex flex-col gap-[3px] shrink-0 mr-1 touch-none">
                            <div className="w-4 h-[2px] bg-blue-muted/60 rounded-full" />
                            <div className="w-4 h-[2px] bg-blue-muted/60 rounded-full" />
                            <div className="w-4 h-[2px] bg-blue-muted/60 rounded-full" />
                        </div>

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
