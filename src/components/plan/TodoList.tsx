'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { usePlan } from '@/context/PlanContext'
import TaskMenu from './TaskMenu'
import LoadingSkeleton, { ErrorCard } from './LoadingSkeleton'

export default function TodoList() {
    const { tasks, loading, error, updateTask, deleteTask, reorderTasks, refreshData } = usePlan()
    const router = useRouter()
    const { t } = useTranslation()
    const dragItem = useRef<number | null>(null)
    const dragOverItem = useRef<number | null>(null)
    const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

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

    // Clean localization of Supabase fetch error
    const translatedError = error === 'Could not load your data. Showing sample data.'
        ? t('plan.errorLoading')
        : error

    return (
        <section>
            <h2 className="text-navy dark:text-slate-100 text-lg font-semibold mb-3">{t('plan.todo')}</h2>

            {/* Loading skeleton */}
            {loading && <LoadingSkeleton rows={3} type="task" />}

            {/* Error state */}
            {!loading && error && <ErrorCard message={translatedError || ''} onRetry={refreshData} />}

            {/* Task list */}
            {!loading && (
                <div className="flex flex-col gap-2">
                    {tasks.length === 0 ? (
                        <p className="text-blue-muted text-sm py-4 text-center">
                            {t('plan.noTasks')}
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
                                className={`flex items-center gap-3 bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-2xl px-3.5 py-3.5 cursor-grab active:cursor-grabbing transition-all relative shadow-sm ${draggingIdx === index ? 'opacity-50 scale-[0.97]' : 'opacity-100'
                                    } ${openMenuId === task.id ? 'z-50' : 'z-10'}`}
                            >
                                {/* Drag handle */}
                                <div className="flex flex-col gap-[3px] shrink-0 mr-1 touch-none">
                                    <div className="w-4 h-[2px] bg-slate-300 dark:bg-slate-600 rounded-full" />
                                    <div className="w-4 h-[2px] bg-slate-300 dark:bg-slate-600 rounded-full" />
                                    <div className="w-4 h-[2px] bg-slate-300 dark:bg-slate-600 rounded-full" />
                                </div>

                                {/* Checkbox */}
                                <button
                                    onClick={() => toggleTask(task.id)}
                                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${task.is_completed ? 'bg-[#2B6BFF] border-[#2B6BFF]' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0B1021]'
                                        }`}
                                    aria-label={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
                                >
                                    {task.is_completed && (
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                            <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>

                                {/* Title + Tags */}
                                <div className="flex-1 min-w-0">
                                    <span className={`text-sm font-semibold transition-all block truncate ${task.is_completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'
                                        }`}>
                                        {task.title}
                                    </span>
                                    {task.tags.length > 0 && (
                                        <div className="flex gap-1.5 mt-1 flex-wrap">
                                            {task.tags.map((tag) => (
                                                <span key={tag} className="text-[10px] font-medium bg-blue-50 dark:bg-blue-500/10 text-[#2B6BFF] px-2 py-0.5 rounded-full">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Menu */}
                                <TaskMenu
                                    onEdit={() => router.push(`/plan/edit-task?id=${task.id}`)}
                                    onDelete={() => deleteTask(task.id)}
                                    onRename={() => handleRename(task.id)}
                                    onTag={() => handleTag(task.id)}
                                    onOpenChange={(isOpen) => setOpenMenuId(isOpen ? task.id : null)}
                                />
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add task button */}
            <button
                onClick={() => router.push('/plan/new-task')}
                className="w-full h-11 bg-[#2B6BFF] hover:bg-blue-600 text-white text-sm font-semibold rounded-xl mt-3 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5"
            >
                + {t('plan.addTask')}
            </button>
        </section>
    )
}
