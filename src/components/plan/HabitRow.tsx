'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { HabitItem } from '@/context/PlanContext'
import TaskMenu from './TaskMenu'
import { MCheckbox, StreakChip } from '@/components/mobile/ui'
import { localDateStr, parseYMDToLocalNoon, addDaysYMD } from '@/lib/utils/date'
import { createClient } from '@/lib/supabase'
import { awardXP } from '@/lib/xp/award'

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

                    awardXP(5, 'Habit Logged')
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

    // Display only: the habit colour tints the icon tile (16% fill, 40% border).
    const tileStyle = habit.color
        ? {
            background: `color-mix(in srgb, ${habit.color} 16%, transparent)`,
            borderColor: `color-mix(in srgb, ${habit.color} 40%, transparent)`,
        }
        : undefined

    return (
        <div className={`habit-card m-glass m-glass-md flex flex-col !overflow-visible ${isMenuOpen ? 'z-50' : 'z-10'}`}>
            {/* Main Card Header */}
            <div
                className="flex items-center gap-3 min-h-[64px] py-3 pl-3 pr-4 cursor-pointer select-none"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
            >
                {/* Habit Icon */}
                <span className="m-tile text-[22px] leading-none select-none" style={tileStyle} aria-hidden="true">
                    {habit.icon || '🎯'}
                </span>

                {/* Habit Name + streak */}
                <div className="flex-1 min-w-0">
                    <span className="m-headline text-ink block truncate">
                        {habit.name}
                    </span>
                    <StreakChip className="mt-1 !h-6 !text-[12px]">
                        {localStreak} {localStreak === 1 ? 'day' : 'days'}
                    </StreakChip>
                </div>

                {/* 0ms Checkbox */}
                <MCheckbox
                    checked={isCheckedToday}
                    onClick={handleToggle}
                    label={isCheckedToday ? 'Unmark habit' : 'Complete habit'}
                    size="lg"
                />

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
                <div className="border-t border-line px-4 pt-4 pb-3">
                    <div className="flex justify-between items-center mb-3">
                        <span className="m-overline text-ink-2">{t('insights.performance')}</span>
                        <span className="m-footnote text-ink-2 m-num">{completedCount} of 365 days</span>
                    </div>

                    {/* True 365-Day Grid: 7 rows × 53 columns starting from top-left */}
                    <div
                        className="mb-4 overflow-x-auto pb-2 fx-no-scrollbar"
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
                                className={`w-3 h-3 rounded-[4px] flex-shrink-0 ${
                                    dot.isFilled
                                        ? 'bg-[var(--m-brand-500)]'
                                        : 'bg-[var(--m-heat-0)]'
                                } ${dot.isToday ? 'ring-1 ring-[var(--m-brand-400)] ring-offset-1 ring-offset-transparent' : ''}`}
                            />
                        ))}
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-[16px] bg-[var(--m-surface-strong)] px-3 py-2.5">
                            <div className="m-stat-m text-ink">
                                {completionPercentage}%
                            </div>
                            <span className="m-caption text-ink-2">Completion</span>
                        </div>
                        <div className="rounded-[16px] bg-[var(--m-surface-strong)] px-3 py-2.5">
                            <div className="m-stat-m text-ink">
                                {averagePerDay}<span className="m-subhead text-ink-2 ml-1">per day</span>
                            </div>
                            <span className="m-caption text-ink-2">Average</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
