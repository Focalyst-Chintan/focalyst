'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { usePlan } from '@/context/PlanContext'
import TaskMenu from './TaskMenu'
import LoadingSkeleton, { ErrorCard } from './LoadingSkeleton'
import { GripVertical, Plus } from 'lucide-react'
import { MCheckbox, SectionHeader, StatusChip } from '@/components/mobile/ui'

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
        <section aria-labelledby="todo-heading">
            <SectionHeader label={<span id="todo-heading">{t('plan.todo')}</span>} count={loading ? undefined : tasks.length} />

            {/* Loading skeleton */}
            {loading && <LoadingSkeleton rows={3} type="task" />}

            {/* Error state */}
            {!loading && error && <ErrorCard message={translatedError || ''} onRetry={refreshData} />}

            {/* Task list */}
            {!loading && (
                <div className="flex flex-col gap-2">
                    {tasks.length === 0 ? (
                        <p className="m-footnote text-ink-2 py-2">
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
                                className={`m-glass m-glass-md flex items-center gap-3 min-h-[60px] py-3.5 pl-2 pr-4 cursor-grab active:cursor-grabbing transition-[transform,opacity] duration-[120ms] ${draggingIdx === index ? 'opacity-50 scale-[0.97]' : task.is_completed ? 'opacity-70' : 'opacity-100'
                                    } ${openMenuId === task.id ? 'z-50' : 'z-10'}`}
                            >
                                {/* Drag handle */}
                                <span className="shrink-0 text-ink-3 touch-none" aria-hidden>
                                    <GripVertical size={16} strokeWidth={1.75} />
                                </span>

                                {/* Checkbox */}
                                <MCheckbox
                                    checked={task.is_completed}
                                    onClick={() => toggleTask(task.id)}
                                    label={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
                                />

                                {/* Title + meta */}
                                <div className="flex-1 min-w-0">
                                    <span className={`m-headline block m-clamp-2 break-words ${task.is_completed ? 'text-ink-2 line-through' : 'text-ink'
                                        }`}>
                                        {task.title}
                                    </span>
                                    {(task.priority || task.tags.length > 0) && (
                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                            {task.priority && (
                                                <StatusChip kind={task.priority} className="!h-6 !text-[12px]">{priorityLabel(task.priority)}</StatusChip>
                                            )}
                                            {task.tags.map((tag) => (
                                                <span key={tag} className="m-footnote text-ink-2">#{tag}</span>
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
                className="m-add-row m-press mt-2"
            >
                <Plus size={18} strokeWidth={1.75} aria-hidden />
                {t('plan.addTask')}
            </button>
        </section>
    )
}

// Display only: sentence-case priority label for the chip.
function priorityLabel(p: string): string {
    return p.charAt(0).toUpperCase() + p.slice(1)
}
