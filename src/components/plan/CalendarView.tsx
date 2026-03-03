'use client'

import { useState } from 'react'
import { usePlan, Reminder } from '@/context/PlanContext'

interface CalendarViewProps {
    onDateSelect?: (date: Date) => void
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1
}

function toDateStr(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function CalendarView({ onDateSelect }: CalendarViewProps) {
    const today = new Date()
    const { getRemindersForDate, addReminder, updateReminder, deleteReminder } = usePlan()

    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const [selectedDate, setSelectedDate] = useState<number>(today.getDate())

    // Reminder form state
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
    const [formTitle, setFormTitle] = useState('')
    const [formStartTime, setFormStartTime] = useState('08:00')
    const [formEndTime, setFormEndTime] = useState('09:00')
    const [formAllDay, setFormAllDay] = useState(false)
    const [formRepeat, setFormRepeat] = useState<Reminder['repeat']>('never')
    const [formError, setFormError] = useState('')

    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

    const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1)
    const prevDays: number[] = []
    for (let i = firstDay - 1; i >= 0; i--) {
        prevDays.push(prevMonthDays - i)
    }
    const currentDays: number[] = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const totalCells = prevDays.length + currentDays.length
    const nextDaysCount = totalCells <= 35 ? 35 - totalCells : 42 - totalCells
    const nextDays: number[] = Array.from({ length: nextDaysCount }, (_, i) => i + 1)

    const selectedDateStr = toDateStr(viewYear, viewMonth, selectedDate)
    const dateReminders = getRemindersForDate(selectedDateStr)

    const goToPrevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
        else setViewMonth(viewMonth - 1)
        setSelectedDate(1)
    }

    const goToNextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
        else setViewMonth(viewMonth + 1)
        setSelectedDate(1)
    }

    const handleSelect = (day: number) => {
        setSelectedDate(day)
        if (onDateSelect) onDateSelect(new Date(viewYear, viewMonth, day))
    }

    const isToday = (day: number) =>
        day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()

    const hasReminders = (day: number) => {
        return getRemindersForDate(toDateStr(viewYear, viewMonth, day)).length > 0
    }

    // ── Form handlers ──
    const resetForm = () => {
        setFormTitle('')
        setFormStartTime('08:00')
        setFormEndTime('09:00')
        setFormAllDay(false)
        setFormRepeat('never')
        setFormError('')
        setShowAddForm(false)
        setEditingReminder(null)
    }

    const openAddForm = () => {
        resetForm()
        setShowAddForm(true)
    }

    const openEditForm = (r: Reminder) => {
        setEditingReminder(r)
        setFormTitle(r.title)
        setFormStartTime(r.start_time)
        setFormEndTime(r.end_time)
        setFormAllDay(r.all_day)
        setFormRepeat(r.repeat)
        setShowAddForm(true)
        setFormError('')
    }

    const handleSaveReminder = () => {
        const trimmed = formTitle.trim()
        if (!trimmed) { setFormError('Title is required'); return }
        if (trimmed.length > 100) { setFormError('Title must be under 100 characters'); return }

        if (editingReminder) {
            updateReminder(editingReminder.id, {
                title: trimmed,
                start_time: formStartTime,
                end_time: formEndTime,
                all_day: formAllDay,
                repeat: formRepeat,
            })
        } else {
            addReminder({
                title: trimmed,
                date: selectedDateStr,
                start_time: formStartTime,
                end_time: formEndTime,
                all_day: formAllDay,
                repeat: formRepeat,
            })
        }
        resetForm()
    }

    return (
        <div>
            {/* Month/Year header */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={goToPrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-card-bg" aria-label="Previous month">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 14L6 9L11 4" stroke="#4A6C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <h3 className="text-navy font-semibold text-base">{MONTH_NAMES[viewMonth]} {viewYear}</h3>
                <button onClick={goToNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-card-bg" aria-label="Next month">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 4L12 9L7 14" stroke="#4A6C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
                {DAY_HEADERS.map((dh) => (
                    <div key={dh} className="text-center text-blue-muted text-xs font-medium py-1">{dh}</div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-y-1">
                {prevDays.map((d) => (
                    <div key={`prev-${d}`} className="text-center py-2"><span className="text-blue-muted/40 text-sm">{d}</span></div>
                ))}
                {currentDays.map((d) => {
                    const isSel = d === selectedDate
                    const isTd = isToday(d)
                    const hasR = hasReminders(d)
                    return (
                        <button key={`cur-${d}`} onClick={() => handleSelect(d)} className="flex flex-col items-center py-1">
                            <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${isSel && isTd ? 'bg-accent text-white'
                                    : isSel ? 'bg-navy text-white'
                                        : isTd ? 'bg-accent/15 text-accent font-bold'
                                            : 'text-navy hover:bg-card-bg'
                                }`}>{d}</span>
                            {hasR && <div className="w-1.5 h-1.5 rounded-full bg-accent mt-0.5" />}
                        </button>
                    )
                })}
                {nextDays.map((d) => (
                    <div key={`next-${d}`} className="text-center py-2"><span className="text-blue-muted/40 text-sm">{d}</span></div>
                ))}
            </div>

            {/* Reminders section */}
            <div className="mt-4 pt-4 border-t border-card-bg">
                {dateReminders.length === 0 ? (
                    <p className="text-blue-muted text-sm">No reminders</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {dateReminders.map((r) => (
                            <div key={r.id} className="flex items-center gap-3 bg-card-bg rounded-xl px-3 py-2.5">
                                <div className="flex-1 min-w-0">
                                    <p className="text-navy text-sm font-medium truncate">{r.title}</p>
                                    <p className="text-blue-muted text-xs">
                                        {r.all_day ? 'All day' : `${r.start_time} - ${r.end_time}`}
                                        {r.repeat !== 'never' && ` · ${r.repeat}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openEditForm(r)}
                                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/50"
                                        aria-label="Edit reminder"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                            <path d="M2 10.5V12H3.5L10.2 5.3L8.7 3.8L2 10.5Z" fill="#4A6C8C" />
                                            <path d="M11.4 3.1L10.9 2.6C10.5 2.2 9.9 2.2 9.5 2.6L8.5 3.6L10.5 5.6L11.4 4.7C11.8 4.3 11.8 3.5 11.4 3.1Z" fill="#4A6C8C" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => deleteReminder(r.id)}
                                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50"
                                        aria-label="Delete reminder"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                            <path d="M3 4H11L10.3 12H3.7L3 4Z" stroke="#ef4444" strokeWidth="1.2" />
                                            <path d="M2 4H12" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" />
                                            <path d="M5 4V2.5C5 2.2 5.2 2 5.5 2H8.5C8.8 2 9 2.2 9 2.5V4" stroke="#ef4444" strokeWidth="1.2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add reminder button */}
                {!showAddForm && (
                    <button onClick={openAddForm} className="text-accent text-sm font-medium mt-2 hover:underline">
                        + Add reminder
                    </button>
                )}

                {/* Add/Edit reminder form */}
                {showAddForm && (
                    <div className="mt-3 bg-card-bg rounded-xl p-4">
                        <h4 className="text-navy text-sm font-semibold mb-3">
                            {editingReminder ? 'Edit reminder' : 'New reminder'}
                        </h4>

                        <input
                            type="text"
                            value={formTitle}
                            onChange={(e) => { setFormTitle(e.target.value); setFormError('') }}
                            placeholder="Reminder title"
                            className="w-full h-10 bg-white rounded-lg px-3 text-sm text-navy placeholder:text-blue-muted outline-none focus:ring-2 focus:ring-navy/30 mb-2"
                            autoFocus
                            maxLength={100}
                        />

                        {/* All day toggle */}
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-muted text-xs">All-day</span>
                            <button
                                onClick={() => setFormAllDay(!formAllDay)}
                                className={`w-10 h-6 rounded-full p-0.5 transition-colors ${formAllDay ? 'bg-navy' : 'bg-white'}`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${formAllDay ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Time pickers */}
                        {!formAllDay && (
                            <div className="flex gap-2 mb-2">
                                <div className="flex-1">
                                    <label className="text-blue-muted text-[10px] block mb-0.5">Starts</label>
                                    <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)}
                                        className="w-full h-9 bg-white rounded-lg px-2 text-xs text-navy outline-none focus:ring-2 focus:ring-navy/30" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-blue-muted text-[10px] block mb-0.5">Ends</label>
                                    <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)}
                                        className="w-full h-9 bg-white rounded-lg px-2 text-xs text-navy outline-none focus:ring-2 focus:ring-navy/30" />
                                </div>
                            </div>
                        )}

                        {/* Repeat */}
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-blue-muted text-xs">Repeat</span>
                            <select
                                value={formRepeat}
                                onChange={(e) => setFormRepeat(e.target.value as Reminder['repeat'])}
                                className="h-8 bg-white rounded-lg px-2 text-xs text-navy outline-none border-none"
                            >
                                <option value="never">Never</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>

                        {formError && <p className="text-red-500 text-xs mb-2">{formError}</p>}

                        <div className="flex gap-2">
                            <button onClick={resetForm} className="flex-1 h-9 bg-white text-navy text-xs font-semibold rounded-lg">
                                Cancel
                            </button>
                            <button onClick={handleSaveReminder} className="flex-1 h-9 bg-accent text-white text-xs font-semibold rounded-lg">
                                {editingReminder ? 'Save' : 'Add'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
