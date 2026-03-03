'use client'

import { useState } from 'react'

interface CalendarViewProps {
    onDateSelect?: (date: Date) => void
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
    // 0 = Sunday, convert to Monday-start: Mon = 0, Sun = 6
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function CalendarView({ onDateSelect }: CalendarViewProps) {
    const today = new Date()
    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const [selectedDate, setSelectedDate] = useState<number>(today.getDate())

    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

    // Previous month overflow days
    const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1)
    const prevDays: number[] = []
    for (let i = firstDay - 1; i >= 0; i--) {
        prevDays.push(prevMonthDays - i)
    }

    // Current month days
    const currentDays: number[] = Array.from({ length: daysInMonth }, (_, i) => i + 1)

    // Next month overflow to fill 6 rows
    const totalCells = prevDays.length + currentDays.length
    const nextDaysCount = totalCells <= 35 ? 35 - totalCells : 42 - totalCells
    const nextDays: number[] = Array.from({ length: nextDaysCount }, (_, i) => i + 1)

    const goToPrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11)
            setViewYear(viewYear - 1)
        } else {
            setViewMonth(viewMonth - 1)
        }
        setSelectedDate(1)
    }

    const goToNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0)
            setViewYear(viewYear + 1)
        } else {
            setViewMonth(viewMonth + 1)
        }
        setSelectedDate(1)
    }

    const handleSelect = (day: number) => {
        setSelectedDate(day)
        if (onDateSelect) {
            onDateSelect(new Date(viewYear, viewMonth, day))
        }
    }

    const isToday = (day: number) =>
        day === today.getDate() &&
        viewMonth === today.getMonth() &&
        viewYear === today.getFullYear()

    return (
        <div>
            {/* Month/Year header with nav arrows */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={goToPrevMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-card-bg transition-colors"
                    aria-label="Previous month"
                >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M11 14L6 9L11 4" stroke="#4A6C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <h3 className="text-navy font-semibold text-base">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                </h3>

                <button
                    onClick={goToNextMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-card-bg transition-colors"
                    aria-label="Next month"
                >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M7 4L12 9L7 14" stroke="#4A6C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
                {DAY_HEADERS.map((dh) => (
                    <div key={dh} className="text-center text-blue-muted text-xs font-medium py-1">
                        {dh}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-y-1">
                {/* Previous month overflow */}
                {prevDays.map((d) => (
                    <div key={`prev-${d}`} className="text-center py-2">
                        <span className="text-blue-muted/40 text-sm">{d}</span>
                    </div>
                ))}

                {/* Current month */}
                {currentDays.map((d) => {
                    const isSel = d === selectedDate
                    const isTd = isToday(d)

                    return (
                        <button
                            key={`cur-${d}`}
                            onClick={() => handleSelect(d)}
                            className="flex items-center justify-center py-1"
                        >
                            <span
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${isSel && isTd
                                        ? 'bg-accent text-white'
                                        : isSel
                                            ? 'bg-navy text-white'
                                            : isTd
                                                ? 'bg-accent/15 text-accent font-bold'
                                                : 'text-navy hover:bg-card-bg'
                                    }`}
                            >
                                {d}
                            </span>
                        </button>
                    )
                })}

                {/* Next month overflow */}
                {nextDays.map((d) => (
                    <div key={`next-${d}`} className="text-center py-2">
                        <span className="text-blue-muted/40 text-sm">{d}</span>
                    </div>
                ))}
            </div>

            {/* Selected date info */}
            <div className="mt-4 pt-4 border-t border-card-bg">
                <p className="text-blue-muted text-sm">No reminders</p>
                <button className="text-accent text-sm font-medium mt-2 hover:underline">
                    + Add reminder
                </button>
            </div>
        </div>
    )
}
