'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { HabitItem } from '@/context/PlanContext'
import TaskMenu from './TaskMenu'
import { useRouter } from 'next/navigation'

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

/**
 * Build a chronological array of 365 day entries for the current year.
 * Each entry maps to one calendar day from Jan 1 to Dec 31.
 */
function buildYearCalendar(completedDates: string[], todayStr: string): DayEntry[] {
    const year = new Date().getFullYear()
    const completedSet = new Set(completedDates)
    const entries: DayEntry[] = []

    // Iterate from Jan 1 to Dec 31 of the current year
    const startDate = new Date(year, 0, 1) // Jan 1
    const endDate = new Date(year, 11, 31) // Dec 31

    const current = new Date(startDate)
    while (current <= endDate) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
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
 * Compute the number of empty cells to prepend so that Jan 1 lands
 * on the correct row (day-of-week). Row 0 = Monday, Row 6 = Sunday.
 */
function getJan1Offset(): number {
    const year = new Date().getFullYear()
    const jan1 = new Date(year, 0, 1)
    const jsDay = jan1.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
    // Convert to Mon=0 ... Sun=6
    return jsDay === 0 ? 6 : jsDay - 1
}

function getTodayStr(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function HabitRow({ habit, onToggle, onEdit, onDelete, onRename }: HabitRowProps) {
    const router = useRouter()

    // 1. Dynamic data state
    const [isCheckedToday, setIsCheckedToday] = useState(habit.completed_today)
    const [currentStreak, setCurrentStreak] = useState(habit.current_streak || 0)
    const [isExpanded, setIsExpanded] = useState(false)
    const [localCompletedDates, setLocalCompletedDates] = useState<string[]>(habit.completedDates || [])

    // Sync with prop changes
    useEffect(() => {
        setIsCheckedToday(habit.completed_today)
        setCurrentStreak(habit.current_streak || 0)
        setLocalCompletedDates(habit.completedDates || [])
    }, [habit.completed_today, habit.current_streak, habit.completedDates])

    // Build the chronological calendar
    const todayDate = getTodayStr()
    const yearCalendar = useMemo(
        () => buildYearCalendar(localCompletedDates, todayDate),
        [localCompletedDates, todayDate]
    )

    // 2. Time-Based Logic (Midnight Reset)
    useEffect(() => {
        const checkMidnight = () => {
            const now = new Date()
            if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
                setIsCheckedToday((prevChecked) => {
                    if (!prevChecked) {
                        setCurrentStreak(0)
                    }
                    return false
                })
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

            setCurrentStreak(streak => {
                if (newValue) {
                    return streak === 0 ? 1 : streak + 1
                } else {
                    return Math.max(0, streak - 1)
                }
            })

            return newValue
        })

        onToggle()
    }

    const toggleExpand = () => {
        setIsExpanded(!isExpanded)
    }

    const completedDaysCount = yearCalendar.filter(d => d.isCompleted).length
    const totalDays = yearCalendar.length
    const completionPercentage = Math.round((completedDaysCount / totalDays) * 100)
    const averagePerDay = (completedDaysCount / totalDays).toFixed(1)

    // Compute offset for Jan 1 alignment
    const jan1Offset = getJan1Offset()

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
                    Streak {currentStreak} days
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

                    {/* Contribution Graph: 7 rows (Mon-Sun) × 53 columns (weeks) */}
                    <div
                        className="mb-6 overflow-x-auto"
                        style={{
                            display: 'grid',
                            gridTemplateRows: 'repeat(7, 1fr)',
                            gridAutoFlow: 'column',
                            gridAutoColumns: 'minmax(0, 1fr)',
                            gap: '3px',
                        }}
                    >
                        {/* Empty offset cells so Jan 1 aligns to the correct day-of-week row */}
                        {Array.from({ length: jan1Offset }).map((_, i) => (
                            <div key={`offset-${i}`} className="w-2.5 h-2.5" />
                        ))}

                        {/* Actual day circles */}
                        {yearCalendar.map((day) => (
                            <div
                                key={day.date}
                                title={day.date}
                                className={`w-2.5 h-2.5 rounded-full ${day.isCompleted
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
