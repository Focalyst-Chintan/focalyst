'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { HabitItem } from '@/context/PlanContext'
import TaskMenu from './TaskMenu'
import { localDateStr, parseYMDToLocalNoon, addDaysYMD } from '@/lib/utils/date'
import { createClient } from '@/lib/supabase'

interface HabitRowProps {
    habit: HabitItem
    onToggle: () => void
    onEdit: () => void
    onDelete: () => void
    onRename: () => void
}

export default function HabitRow({ habit, onToggle, onEdit, onDelete, onRename }: HabitRowProps) {
    const { t } = useTranslation()
    const todayYMD = localDateStr()

    // 1. Dynamic local data state for 0ms instant optimistic updates
    const [isCheckedToday, setIsCheckedToday] = useState(
        habit.completed_today || (habit.completedDates || []).includes(todayYMD)
    )
    const [isExpanded, setIsExpanded] = useState(false)
    const [localCompletedDates, setLocalCompletedDates] = useState<string[]>(habit.completedDates || [])
    const [localStreak, setLocalStreak] = useState<number>(habit.current_streak || 0)
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    // Sync with prop changes
    useEffect(() => {
        setIsCheckedToday(habit.completed_today || (habit.completedDates || []).includes(todayYMD))
        setLocalCompletedDates(habit.completedDates || [])
        setLocalStreak(habit.current_streak || 0)
    }, [habit.completed_today, habit.completedDates, habit.current_streak, todayYMD])

    // 2. Instant 0ms Checkbox Toggle with Supabase persistence & event dispatch
    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation()

        const nextChecked = !isCheckedToday
        setIsCheckedToday(nextChecked)

        const nextDates = nextChecked
            ? (localCompletedDates.includes(todayYMD) ? localCompletedDates : [...localCompletedDates, todayYMD])
            : localCompletedDates.filter(d => d !== todayYMD)
        setLocalCompletedDates(nextDates)

        const nextStreak = nextChecked ? localStreak + 1 : Math.max(0, localStreak - 1)
        setLocalStreak(nextStreak)

        // Instant dispatch so other views (Insights, Leaderboard) react immediately
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('focalyst:habit-updated', {
                detail: { habitId: habit.id, completed: nextChecked, streak: nextStreak }
            }))
        }

        // Persist to Supabase in background
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                if (nextChecked) {
                    await supabase
                        .from('habit_logs')
                        .upsert({
                            habit_id: habit.id,
                            user_id: user.id,
                            completed_date: todayYMD,
                        }, { onConflict: 'habit_id,completed_date' })

                    await supabase
                        .from('habits')
                        .update({ current_streak: nextStreak })
                        .eq('id', habit.id)
                } else {
                    await supabase
                        .from('habit_logs')
                        .delete()
                        .eq('habit_id', habit.id)
                        .eq('completed_date', todayYMD)

                    await supabase
                        .from('habits')
                        .update({ current_streak: nextStreak })
                        .eq('id', habit.id)
                }
            }
        } catch (err) {
            console.error('Failed to sync habit toggle to Supabase:', err)
        }

        // Parent context notification
        onToggle()
    }

    // 3. True 365-Day Calendar Matrix starting from top-left (Column 0, Row 0)
    const { dots, completionPercentage, averagePerDay, completedCount } = useMemo(() => {
        const completedSet = new Set(localCompletedDates)
        const sortedDates = [...localCompletedDates].sort()

        let startYMD = sortedDates[0] || (habit.created_at ? String(habit.created_at).slice(0, 10) : todayYMD)
        const startDate = parseYMDToLocalNoon(startYMD)
        const todayDate = parseYMDToLocalNoon(todayYMD)
        const diffDays = Math.round((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

        // If today is more than 364 days after startYMD, slide startYMD to (today - 364 days)
        if (diffDays > 364) {
            startYMD = addDaysYMD(todayYMD, -364)
        }

        const dotList = []
        for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
            const dateForDot = addDaysYMD(startYMD, dayOffset)
            const isFilled = completedSet.has(dateForDot)
            dotList.push({
                date: dateForDot,
                isFilled,
                isToday: dateForDot === todayYMD,
            })
        }

        const completedCount = completedSet.size
        const completionPercentage = Math.min(100, Math.round((completedCount / 365) * 100))
        const averagePerDay = (completedCount / 365).toFixed(1)

        return { dots: dotList, completionPercentage, averagePerDay, completedCount }
    }, [localCompletedDates, habit.created_at, todayYMD])

    // Midnight safety check
    useEffect(() => {
        const checkMidnight = () => {
            const now = new Date()
            if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
                setIsCheckedToday(false)
            }
        }
        const intervalId = setInterval(checkMidnight, 1000)
        return () => clearInterval(intervalId)
    }, [])

    return (
        <div className={`habit-card flex flex-col bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-2xl transition-all duration-200 relative !overflow-visible shadow-sm ${isMenuOpen ? 'z-50' : 'z-10'}`}>
            {/* Main Card Header */}
            <div
                className="flex items-center gap-3 px-3.5 py-3 cursor-pointer select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* 0ms Checkbox */}
                <button
                    onClick={handleToggle}
                    style={isCheckedToday ? { backgroundColor: '#FF6B00', borderColor: '#FF6B00' } : undefined}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        isCheckedToday ? 'bg-[#FF6B00] border-[#FF6B00]' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0B1021]'
                    }`}
                    aria-label={isCheckedToday ? 'Unmark habit' : 'Complete habit'}
                >
                    {isCheckedToday && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </button>

                {/* Habit Icon */}
                <span className="text-xl shrink-0 select-none" aria-hidden="true">
                    {habit.icon || '🎯'}
                </span>

                {/* Habit Name */}
                <span className={`flex-1 text-sm font-semibold transition-all truncate ${isCheckedToday ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>
                    {habit.name}
                </span>

                {/* Streak Badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 dark:bg-orange-500/10 text-[#FF6B00] whitespace-nowrap">
                    🔥 {localStreak}d streak
                </span>

                {/* Task Menu */}
                <div onClick={e => e.stopPropagation()}>
                    <TaskMenu
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onRename={onRename}
                        onTag={() => { }}
                        onOpenChange={setIsMenuOpen}
                    />
                </div>
            </div>

            {/* Expanded 365-Day Dot Matrix */}
            {isExpanded && (
                <div className="border-t border-slate-100 dark:border-[#222A41] px-4 py-4 bg-slate-50/80 dark:bg-[#0B1021]/60 rounded-b-2xl">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">{t('insights.performance')}</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{completedCount} / 365 total days</span>
                    </div>

                    {/* True 365-Day Grid: 7 rows × 53 columns starting from top-left */}
                    <div
                        className="mb-5 overflow-x-auto pb-2 scrollbar-thin"
                        style={{
                            display: 'grid',
                            gridTemplateRows: 'repeat(7, min-content)',
                            gridTemplateColumns: 'repeat(53, min-content)',
                            gridAutoFlow: 'column',
                            gap: '4px',
                        }}
                    >
                        {dots.map((dot) => (
                            <div
                                key={dot.date}
                                title={dot.date}
                                className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${
                                    dot.isFilled
                                        ? 'bg-[#FF6B00]'
                                        : 'border border-slate-300 dark:border-slate-700 bg-transparent'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-[#222A41] py-1 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">COMPLETION</span>
                            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                                {completionPercentage}%
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">AVERAGE</span>
                            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                                {averagePerDay} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/day</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
