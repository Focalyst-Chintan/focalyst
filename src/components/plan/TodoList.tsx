'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlan } from '@/context/PlanContext'
import TaskMenu from './TaskMenu'
import LoadingSkeleton, { ErrorCard } from './LoadingSkeleton'

export default function TodoList() {
    const { tasks, loading, error, updateTask, deleteTask, reorderTasks, refreshData } = usePlan()
    const router = useRouter()
    const dragItem = useRef<number | null>(null)
    const dragOverItem = useRef<number | null>(null)
    const [draggingIdx, setDraggingIdx] = useState<number | null>(null)

    const toggleTask = (id: string) => {
        const task = tasks.find((t) => t.id === id)
        if (task) updateTask(id, { is_completed: !task.is_completed })
    }

    const handleRename = (id: string) => {
        const task = tasks.find((t) => t.id === id)
        if (!task) return
        const newTitle = prompt('Rename task:', task.title)
        if (newTitle && newTitle.trim()) {
            updateTask(id, { title: newTitle.trim() })
        }
    }

    const handleTag = (id: string) => {
        const task = tasks.find((t) => t.id === id)
        if (!task) return
        const newTags = prompt('Tags (comma-separated):', task.tags.join(', '))
        if (newTags !== null) {
            updateTask(id, { tags: newTags.split(',').map((t) => t.trim()).filter(Boolean) })
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
        reorderTasks(reordered)
        dragItem.current = null
        dragOverItem.current = null
        setDraggingIdx(null)
    }

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

            {/* Loading skeleton */}
            {loading && <LoadingSkeleton rows={3} type="task" />}

            {/* Error state */}
            {!loading && error && <ErrorCard message={error} onRetry={refreshData} />}

            {/* Task list */}
            {!loading && (
                <div className="flex flex-col gap-2">
                    {tasks.length === 0 ? (
                        <p className="text-blue-muted text-sm py-4 text-center">
                            No tasks yet. Add your first task below.
                        </p>
                    ) : (
                        tasks.map((task, index) => (
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
                                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${task.is_completed ? 'bg-navy border-navy' : 'border-blue-muted bg-white'
                                        }`}
                                    aria-label={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
                                >
                                    {task.is_completed && (
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                            <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>

                                {/* Title + Tags */}
                                <div className="flex-1 min-w-0">
                                    <span className={`text-sm font-medium transition-all block truncate ${task.is_completed ? 'text-blue-muted line-through' : 'text-navy'
                                        }`}>
                                        {task.title}
                                    </span>
                                    {task.tags.length > 0 && (
                                        <div className="flex gap-1 mt-0.5 flex-wrap">
                                            {task.tags.map((tag) => (
                                                <span key={tag} className="text-[10px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Menu */}
                                <TaskMenu
                                    onEdit={() => router.push(`/plan/edit-task/${task.id}`)}
                                    onDelete={() => deleteTask(task.id)}
                                    onRename={() => handleRename(task.id)}
                                    onTag={() => handleTag(task.id)}
                                />
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add task button */}
            <button
                onClick={() => router.push('/plan/new-task')}
                className="w-full h-11 bg-accent text-white text-sm font-semibold rounded-xl mt-3 transition-all active:scale-[0.98] hover:bg-accent-dark"
            >
                + Add new task
            </button>
        </section>
    )
}
