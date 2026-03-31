'use client'

import { useState, useEffect, useMemo } from 'react'
import { HabitItem } from '@/context/PlanContext'
import TaskMenu from './TaskMenu'

interface HabitRowProps {
    habit: HabitItem
    onToggle: () => void
    onEdit: () => void
    onDelete: () => void
    onRename: () => void
}

interface DayEntry {
    date: string       // 'YYYY-MM-DD'
    isCompleted: boolean
    isFuture: boolean
}

function formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTodayStr(): string {
    return formatDate(new Date())
}

/**
 * Build 365 day entries starting from the habit's creation date.
 * Index 0 = creation date, Index 364 = creation date + 364 days.
 */
function buildRelativeCalendar(createdAt: string, completedDates: string[], todayStr: string): DayEntry[] {
    const completedSet = new Set(completedDates)
    const entries: DayEntry[] = []

    // Parse the creation date (handle ISO timestamps like "2026-03-24T...")
    const creationDate = new Date(createdAt.split('T')[0] + 'T00:00:00')

    const current = new Date(creationDate)
    for (let i = 0; i < 365; i++) {
        const dateStr = formatDate(current)
        entries.push({
            date: dateStr,
            isCompleted: completedSet.has(dateStr),
            isFuture: dateStr > todayStr,
        })
        current.setDate(current.getDate() + 1)
    }

    return entries
}

/**
 * Compute the number of empty offset cells so that the creation date
 * lands on the correct row (day-of-week). Row 0 = Monday, Row 6 = Sunday.
 */
function getStartDayOffset(createdAt: string): number {
    const creationDate = new Date(createdAt.split('T')[0] + 'T00:00:00')
    const jsDay = creationDate.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
    // Convert to Mon=0 ... Sun=6
    return jsDay === 0 ? 6 : jsDay - 1
}

export default function HabitRow({ habit, onToggle, onEdit, onDelete, onRename }: HabitRowProps) {
    // 1. Dynamic data state
    const [isCheckedToday, setIsCheckedToday] = useState(habit.completed_today)
    const [isExpanded, setIsExpanded] = useState(false)
    const [localCompletedDates, setLocalCompletedDates] = useState<string[]>(habit.completedDates || [])

    // Sync with prop changes
    useEffect(() => {
        setIsCheckedToday(habit.completed_today)
        setLocalCompletedDates(habit.completedDates || [])
    }, [habit.completed_today, habit.completedDates])

    // Compute continuous unbroken streak from the chronological data
    const computedStreak = useMemo(() => {
        let streak = 0
        const today = new Date()
        const todayStr = formatDate(today)
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)

        const set = new Set(localCompletedDates)

        let current = new Date(today)
        if (!set.has(todayStr)) {
            current = new Date(yesterday)
        }

        while (set.has(formatDate(current))) {
            streak++
            current.setDate(current.getDate() - 1)
        }

        return streak
    }, [localCompletedDates])

    // Build the relative calendar starting from habit creation date
    const todayDate = getTodayStr()
    const calendar = useMemo(
        () => buildRelativeCalendar(habit.created_at, localCompletedDates, todayDate),
        [habit.created_at, localCompletedDates, todayDate]
    )

    // Compute offset so creation date lands on correct day-of-week row
    const startOffset = useMemo(() => getStartDayOffset(habit.created_at), [habit.created_at])

    // 2. Time-Based Logic (Midnight Reset)
    useEffect(() => {
        const checkMidnight = () => {
            const now = new Date()
            if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
                setIsCheckedToday(false) // Dynamic streak naturally recalibrates
            }
        }

        const intervalId = setInterval(checkMidnight, 1000)
        return () => clearInterval(intervalId)
    }, [])

    // Checkbox Action
    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation()

        setIsCheckedToday(prev => {
            const newValue = !prev

            // Update local completed dates to sync the grid
            setLocalCompletedDates(dates => {
                const today = getTodayStr()
                if (newValue) {
                    return dates.includes(today) ? dates : [...dates, today]
                } else {
                    return dates.filter(d => d !== today)
                }
            })

            return newValue
        })

        onToggle()
    }

    const toggleExpand = () => {
        setIsExpanded(!isExpanded)
    }

    const completedDaysCount = calendar.filter(d => d.isCompleted).length
    const totalDays = 365
    const completionPercentage = Math.round((completedDaysCount / totalDays) * 100)
    const averagePerDay = (completedDaysCount / totalDays).toFixed(1)

    // Compute total columns needed: offset + 365 days, ceiling to fill last column
    const totalCells = startOffset + totalDays
    const numColumns = Math.ceil(totalCells / 7)

    return (
        <div className="flex flex-col bg-card-bg rounded-xl overflow-hidden transition-all duration-300">
            {/* Main Card Body */}
            <div
                className="flex items-center gap-3 px-3 py-3 cursor-pointer"
                onClick={toggleExpand}
            >
                {/* Checkbox */}
                <button
                    onClick={handleToggle}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isCheckedToday ? 'bg-navy border-navy' : 'border-blue-muted bg-white'
                        }`}
                    aria-label={isCheckedToday ? 'Unmark habit' : 'Complete habit'}
                >
                    {isCheckedToday && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </button>

                {/* Name */}
                <span className={`flex-1 text-sm font-medium transition-all ${isCheckedToday ? 'text-blue-muted line-through' : 'text-navy'}`}>
                    {habit.name}
                </span>

                {/* Streak badge */}
                <span className="text-blue-muted text-xs font-medium whitespace-nowrap">
                    Streak {computedStreak} days
                </span>

                {/* Menu */}
                <div onClick={e => e.stopPropagation()}>
                    <TaskMenu
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onRename={onRename}
                        onTag={() => { }}
                    />
                </div>
            </div>

            {/* Expanded Dropdown Content */}
            {isExpanded && (
                <div className="border-t border-navy/10 px-4 py-4 bg-[#EAF3FA]">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-navy tracking-wider uppercase">Your Progress</span>
                        <span className="text-xs font-bold text-navy">{completedDaysCount} / {totalDays} Days</span>
                    </div>

                    {/* Contribution Graph: 7 rows (Mon-Sun) × dynamic columns */}
                    <div
                        className="mb-6 overflow-x-auto"
                        style={{
                            display: 'grid',
                            gridTemplateRows: 'repeat(7, min-content)',
                            gridTemplateColumns: `repeat(${numColumns}, min-content)`,
                            gridAutoFlow: 'column',
                            gap: '4px',
                        }}
                    >
                        {/* Empty offset cells so creation date aligns to correct day-of-week row */}
                        {Array.from({ length: startOffset }).map((_, i) => (
                            <div key={`offset-${i}`} className="w-3 h-3" />
                        ))}

                        {/* Actual day circles */}
                        {calendar.map((day) => (
                            <div
                                key={day.date}
                                title={day.date}
                                className={`w-3 h-3 rounded-full flex-shrink-0 ${day.isCompleted
                                        ? 'bg-navy'
                                        : 'border border-[#C8CCD0]'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Metrics */}
                    <div className="flex mb-2 text-center items-center justify-center">
                        <div className="flex-1 border-r border-navy/10 flex flex-col items-center">
                            <span className="text-[10px] font-bold text-navy/60 tracking-wider">COMPLETION</span>
                            <div className="text-xl font-bold text-navy">
                                {completionPercentage}%
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-[10px] font-bold text-navy/60 tracking-wider">AVERAGE</span>
                            <div className="text-xl font-bold text-navy">
                                {averagePerDay} <span className="text-sm font-normal text-navy/70">/day</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
