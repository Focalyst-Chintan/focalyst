'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { localDateStr, parseYMDToLocalNoon, addDaysYMD } from '@/lib/utils/date'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/lib/data/useData'
import { useSWRConfig } from 'swr'
import { emitDataChanged } from '@/lib/events'
import { useToast } from '@/components/desktop/ui/Toast'
import { normalizeReminderRows, logReminderQueryError } from '@/lib/utils/reminders'
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Plus,
    Star,
    Edit2,
    Trash2,
    Check,
    Clock,
    X,
    Calendar as CalendarIcon
} from 'lucide-react'

export interface ReminderItem {
    id: string
    user_id?: string
    title: string
    description?: string | null
    date: string        // YYYY-MM-DD
    start_time: string  // HH:mm
    end_time: string    // HH:mm
    all_day: boolean
    repeat: string      // 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    custom_interval?: number
    custom_frequency?: 'day' | 'week' | 'month' | 'year'
    tag?: 'Health' | 'Work' | 'Urgent' | 'Study' | 'Personal'
    category?: 'Health' | 'Work' | 'Urgent' | 'Study' | 'Personal'
    color?: string
    is_completed?: boolean
    is_starred?: boolean
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const CATEGORIES: { label: ReminderItem['category']; color: string; bgLight: string; bgDark: string }[] = [
    { label: 'Health', color: '#10B981', bgLight: 'rgba(16, 185, 129, 0.12)', bgDark: 'rgba(16, 185, 129, 0.20)' },
    { label: 'Work', color: '#2B6BFF', bgLight: 'rgba(43, 107, 255, 0.12)', bgDark: 'rgba(43, 107, 255, 0.20)' },
    { label: 'Urgent', color: '#EF4444', bgLight: 'rgba(239, 68, 68, 0.12)', bgDark: 'rgba(239, 68, 68, 0.20)' },
    { label: 'Study', color: '#8B5CF6', bgLight: 'rgba(139, 92, 246, 0.12)', bgDark: 'rgba(139, 92, 246, 0.20)' },
    { label: 'Personal', color: '#F97316', bgLight: 'rgba(249, 115, 22, 0.12)', bgDark: 'rgba(249, 115, 22, 0.20)' },
]

const COLOR_SWATCHES = ['#10B981', '#2B6BFF', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4']

const REPEAT_OPTIONS = [
    { label: 'Never', value: 'never' },
    { label: 'Every Day', value: 'daily' },
    { label: 'Every Week', value: 'weekly' },
    { label: 'Every Month', value: 'monthly' },
    { label: 'Every Year', value: 'yearly' },
    { label: 'Custom', value: 'custom' },
]

function formatTime12(timeStr: string): string {
    if (!timeStr) return ''
    const [hStr, mStr] = timeStr.split(':')
    let h = parseInt(hStr || '0', 10)
    const m = mStr || '00'
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${h}:${m} ${ampm}`
}

export function doesReminderOccurOnDate(rem: ReminderItem, targetYMD: string): boolean {
    const baseDateStr = rem.date ? String(rem.date).slice(0, 10) : targetYMD
    if (targetYMD < baseDateStr) return false

    const repeatNorm = (rem.repeat || 'never').toLowerCase()

    if (repeatNorm === 'never') {
        return targetYMD === baseDateStr
    }

    if (repeatNorm === 'daily' || repeatNorm === 'every day') {
        return true
    }

    const targetDate = parseYMDToLocalNoon(targetYMD)
    const baseDate = parseYMDToLocalNoon(baseDateStr)

    if (repeatNorm === 'weekly' || repeatNorm === 'every week') {
        return targetDate.getDay() === baseDate.getDay()
    }

    if (repeatNorm === 'monthly' || repeatNorm === 'every month') {
        return targetDate.getDate() === baseDate.getDate()
    }

    if (repeatNorm === 'yearly' || repeatNorm === 'every year') {
        return targetDate.getMonth() === baseDate.getMonth() && targetDate.getDate() === baseDate.getDate()
    }

    if (repeatNorm === 'custom') {
        const interval = Math.max(1, rem.custom_interval || 1)
        const freq = rem.custom_frequency || 'day'
        const diffDays = Math.round((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))

        if (freq === 'day') {
            return diffDays % interval === 0
        }
        if (freq === 'week') {
            return targetDate.getDay() === baseDate.getDay() && (Math.floor(diffDays / 7) % interval === 0)
        }
        if (freq === 'month') {
            const monthsDiff = (targetDate.getFullYear() - baseDate.getFullYear()) * 12 + (targetDate.getMonth() - baseDate.getMonth())
            return targetDate.getDate() === baseDate.getDate() && monthsDiff % interval === 0
        }
        if (freq === 'year') {
            const yearsDiff = targetDate.getFullYear() - baseDate.getFullYear()
            return targetDate.getMonth() === baseDate.getMonth() && targetDate.getDate() === baseDate.getDate() && yearsDiff % interval === 0
        }
    }

    return targetYMD === baseDateStr
}

function schedule3StageNotifications(title: string, dateYMD: string, startTime: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') {
        Notification.requestPermission()
    }

    const [h, m] = (startTime || '09:00').split(':').map(Number)
    const startDate = parseYMDToLocalNoon(dateYMD)
    startDate.setHours(h, m, 0, 0)
    const startMs = startDate.getTime()

    const stages = [
        { label: '3 days before', time: startMs - 72 * 60 * 60 * 1000, body: `Upcoming in 3 days: ${title}` },
        { label: '24 hours before', time: startMs - 24 * 60 * 60 * 1000, body: `Reminder tomorrow: ${title}` },
        { label: 'At start time', time: startMs, body: `Starting now: ${title}` },
    ]

    stages.forEach(stage => {
        const delay = stage.time - Date.now()
        // Only schedule if in future within 24h of active browser session
        if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
            setTimeout(() => {
                if (Notification.permission === 'granted') {
                    new Notification(`Focalyst Reminder: ${title}`, {
                        body: stage.body,
                        icon: '/favicon.ico',
                    })
                }
            }, delay)
        }
    })
}

export default function CalendarView({ onDateSelect }: { onDateSelect?: (date: Date) => void }) {
    const supabase = createClient()
    const today = new Date()

    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const [selectedDate, setSelectedDate] = useState<number>(today.getDate())
    const [reminders, setReminders] = useState<ReminderItem[]>([])
    const [loading, setLoading] = useState(true)

    // Quick Jump Modal (Step 1: Year, Step 2: Month)
    const [showQuickJump, setShowQuickJump] = useState(false)
    const [jumpStep, setJumpStep] = useState<1 | 2>(1)
    const [tempYear, setTempYear] = useState(today.getFullYear())

    // Form Modal (New / Edit)
    const [showFormModal, setShowFormModal] = useState(false)
    const [editingReminder, setEditingReminder] = useState<ReminderItem | null>(null)
    const [formTitle, setFormTitle] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formCategory, setFormCategory] = useState<ReminderItem['category']>('Work')
    const [formColor, setFormColor] = useState('#2B6BFF')
    const [formAllDay, setFormAllDay] = useState(false)
    const [formStartTime, setFormStartTime] = useState('09:00')
    const [formEndTime, setFormEndTime] = useState('10:00')
    const [formRepeat, setFormRepeat] = useState('never')
    const [formCustomInterval, setFormCustomInterval] = useState(1)
    const [formCustomFreq, setFormCustomFreq] = useState<'day' | 'week' | 'month' | 'year'>('week')
    const [formError, setFormError] = useState('')
    const [formSaving, setFormSaving] = useState(false)
    const { user } = useAuth()
    const { mutate } = useSWRConfig()
    const toast = useToast()

    // Fetch all user reminders with user_id to satisfy RLS
    const fetchUserReminders = useCallback(async (): Promise<ReminderItem[]> => {
        if (!user) return []
        // select('*'): the date column is `day`, and naming a column that
        // doesn't exist fails the whole query. Rows are normalised so `date`
        // and the custom repeat fields are set for every format.
        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', user.id)

        if (error) {
            logReminderQueryError(error)
            throw error
        }
        return normalizeReminderRows(data) as unknown as ReminderItem[]
    }, [user, supabase])

    const remindersKey = user ? `reminders:${user.id}` : null
    const { data: cachedReminders, isLoading: remindersLoading, mutate: mutateReminders } = useData<ReminderItem[]>(remindersKey, fetchUserReminders)

    useEffect(() => {
        if (cachedReminders) {
            setReminders(cachedReminders)
        }
        setLoading(remindersLoading)
    }, [cachedReminders, remindersLoading])

    // Days in current month grid
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDayIndex = (() => {
        const d = new Date(viewYear, viewMonth, 1).getDay()
        return d === 0 ? 6 : d - 1 // Monday is 0
    })()

    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()
    const prevDays: number[] = []
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        prevDays.push(prevMonthDays - i)
    }

    const currentDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const totalCells = prevDays.length + currentDays.length
    const nextDaysCount = totalCells <= 35 ? 35 - totalCells : 42 - totalCells
    const nextDays = Array.from({ length: nextDaysCount }, (_, i) => i + 1)

    const selectedYMD = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`

    // Reminders occurring on the selected date
    const selectedDateReminders = useMemo(() => {
        return reminders.filter(r => doesReminderOccurOnDate(r, selectedYMD))
    }, [reminders, selectedYMD])

    // Reminders map for each day of current month to render multi-color dots
    const monthDotsMap = useMemo(() => {
        const map: Record<number, string[]> = {}
        for (let day = 1; day <= daysInMonth; day++) {
            const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const matching = reminders.filter(r => doesReminderOccurOnDate(r, ymd))
            map[day] = matching.map(r => r.color || '#2B6BFF').slice(0, 3)
        }
        return map
    }, [reminders, viewYear, viewMonth, daysInMonth])

    const goToPrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11)
            setViewYear(v => v - 1)
        } else {
            setViewMonth(v => v - 1)
        }
        setSelectedDate(1)
    }

    const goToNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0)
            setViewYear(v => v + 1)
        } else {
            setViewMonth(v => v + 1)
        }
        setSelectedDate(1)
    }

    const handleSelectDay = (day: number) => {
        setSelectedDate(day)
        onDateSelect?.(new Date(viewYear, viewMonth, day))
    }

    // Toggle reminder completion optimistically & persist
    const handleToggleComplete = async (rem: ReminderItem) => {
        const nextCompleted = !rem.is_completed
        const applyToggle = (list: ReminderItem[]) =>
            list.map(r => r.id === rem.id ? { ...r, is_completed: nextCompleted } : r)

        setReminders(prev => applyToggle(prev))

        if (user) {
            const key = `reminders:${user.id}`
            try {
                await mutate<ReminderItem[]>(
                    key,
                    async (current = []) => {
                        const { error } = await supabase.from('reminders').update({ is_completed: nextCompleted }).eq('id', rem.id)
                        if (error) throw error
                        return applyToggle(current)
                    },
                    {
                        optimisticData: (current = []) => applyToggle(current),
                        rollbackOnError: true,
                        revalidate: false,
                    }
                )
                emitDataChanged('reminder')
            } catch (err) {
                console.error('Failed to toggle reminder completion:', err)
                toast.show("Could not save. Check your connection and try again.", 'error')
            }
        }
    }

    // Toggle star
    const handleToggleStar = async (rem: ReminderItem) => {
        const nextStarred = !rem.is_starred
        setReminders(prev => prev.map(r => r.id === rem.id ? { ...r, is_starred: nextStarred } : r))

        try {
            await supabase.from('reminders').update({ is_starred: nextStarred }).eq('id', rem.id)
        } catch (err) {
            console.error('Failed to toggle star:', err)
        }
    }

    // Delete reminder
    const handleDeleteReminder = async (rem: ReminderItem) => {
        // Remove immediately
        setReminders(prev => prev.filter(r => r.id !== rem.id))

        let undone = false
        const executeDelete = async () => {
            if (undone) return
            try {
                await supabase.from('reminders').delete().eq('id', rem.id)
                emitDataChanged('reminder')
            } catch (err) {
                console.error('Failed to delete reminder:', err)
            }
        }

        const timeoutId = setTimeout(() => {
            void executeDelete()
        }, 5000)

        toast.show(
            'Deleted',
            'info',
            {
                label: 'Undo',
                onClick: () => {
                    undone = true
                    clearTimeout(timeoutId)
                    setReminders(prev => [rem, ...prev.filter(r => r.id !== rem.id)])
                },
            },
            {
                duration: 5000,
                onClose: () => {
                    if (!undone) {
                        clearTimeout(timeoutId)
                        void executeDelete()
                    }
                },
            }
        )
    }

    // Open Form
    const openNewForm = () => {
        setEditingReminder(null)
        setFormTitle('')
        setFormDescription('')
        setFormCategory('Work')
        setFormColor('#2B6BFF')
        setFormAllDay(false)
        setFormStartTime('09:00')
        setFormEndTime('10:00')
        setFormRepeat('never')
        setFormCustomInterval(1)
        setFormCustomFreq('week')
        setFormError('')
        setShowFormModal(true)
    }

    const openEditForm = (rem: ReminderItem) => {
        setEditingReminder(rem)
        setFormTitle(rem.title)
        setFormDescription(rem.description || '')
        setFormCategory(rem.tag || rem.category || 'Work')
        setFormColor(rem.color || '#2B6BFF')
        setFormAllDay(rem.all_day || false)
        setFormStartTime(rem.start_time || '09:00')
        setFormEndTime(rem.end_time || '10:00')
        setFormRepeat(rem.repeat || 'never')
        setFormCustomInterval(rem.custom_interval || 1)
        setFormCustomFreq(rem.custom_frequency || 'week')
        setFormError('')
        setShowFormModal(true)
    }

    // Save reminder
    const handleSaveReminder = async () => {
        const trimmed = formTitle.trim()
        if (!trimmed) {
            setFormError('Title is required')
            return
        }

        setFormSaving(true)
        setFormError('')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Please sign in to save reminders.')

            const payload: any = {
                user_id: user.id,
                title: trimmed,
                description: formDescription.trim() || null,
                date: selectedYMD,
                start_time: formStartTime,
                end_time: formEndTime,
                all_day: formAllDay,
                repeat: formRepeat,
                custom_interval: formRepeat === 'custom' ? formCustomInterval : null,
                custom_frequency: formRepeat === 'custom' ? formCustomFreq : null,
                tag: formCategory,
                color: formColor,
            }

            if (editingReminder) {
                const { data, error } = await supabase
                    .from('reminders')
                    .update(payload)
                    .eq('id', editingReminder.id)
                    .select()
                    .single()

                if (error) throw error

                setReminders(prev => prev.map(r => r.id === editingReminder.id ? (data as ReminderItem) : r))
            } else {
                payload.is_completed = false
                payload.is_starred = false

                const { data, error } = await supabase
                    .from('reminders')
                    .insert(payload)
                    .select()
                    .single()

                if (error) throw error

                setReminders(prev => [...prev, data as ReminderItem])
            }

            // Schedule 3-stage notifications
            schedule3StageNotifications(trimmed, selectedYMD, formStartTime)

            setShowFormModal(false)
        } catch (err: any) {
            console.error('Failed to save reminder:', err)
            setFormError(err?.message || 'Failed to save reminder.')
        } finally {
            setFormSaving(false)
        }
    }

    const isToday = (day: number) => {
        return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
    }

    return (
        <div className="w-full space-y-5">
            {/* Calendar Card Container */}
            <div className="bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-3xl p-5 shadow-sm">
                {/* Header: Clickable Month/Year Quick-Jump Picker */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={goToPrevMonth}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-[#0B1021] text-slate-600 dark:text-slate-300 transition-colors"
                        aria-label="Previous month"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => {
                            setTempYear(viewYear)
                            setJumpStep(1)
                            setShowQuickJump(true)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#0B1021] transition-colors text-slate-900 dark:text-white font-bold text-base"
                    >
                        <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    <button
                        onClick={goToNextMonth}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-[#0B1021] text-slate-600 dark:text-slate-300 transition-colors"
                        aria-label="Next month"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 mb-2 text-center">
                    {DAY_HEADERS.map((h, i) => (
                        <span key={i} className="text-xs font-semibold text-slate-400 dark:text-slate-500 py-1">
                            {h}
                        </span>
                    ))}
                </div>

                {/* Month Grid */}
                <div className="grid grid-cols-7 gap-y-2 text-center select-none">
                    {/* Previous month days */}
                    {prevDays.map((d) => (
                        <div key={`prev-${d}`} className="h-11 flex flex-col items-center justify-center text-xs text-slate-300 dark:text-slate-700">
                            {d}
                        </div>
                    ))}

                    {/* Current month days */}
                    {currentDays.map((day) => {
                        const isSelected = day === selectedDate
                        const isCurrentDay = isToday(day)
                        const dots = monthDotsMap[day] || []

                        return (
                            <button
                                key={`cur-${day}`}
                                onClick={() => handleSelectDay(day)}
                                className="h-11 flex flex-col items-center justify-center relative transition-all group"
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                                        isSelected
                                            ? 'bg-[#2B6BFF] text-white shadow-md scale-105'
                                            : isCurrentDay
                                            ? 'bg-blue-50 dark:bg-blue-500/10 text-[#2B6BFF] font-bold'
                                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0B1021]'
                                    }`}
                                >
                                    {day}
                                </div>

                                {/* Multi-Color Small Dots (Max 3) */}
                                {dots.length > 0 && (
                                    <div className="flex gap-0.5 justify-center mt-0.5">
                                        {dots.map((dotColor, idx) => (
                                            <span
                                                key={idx}
                                                style={{ backgroundColor: isSelected ? '#FFFFFF' : dotColor }}
                                                className="w-1.5 h-1.5 rounded-full"
                                            />
                                        ))}
                                    </div>
                                )}
                            </button>
                        )
                    })}

                    {/* Next month days */}
                    {nextDays.map((d) => (
                        <div key={`next-${d}`} className="h-11 flex flex-col items-center justify-center text-xs text-slate-300 dark:text-slate-700">
                            {d}
                        </div>
                    ))}
                </div>
            </div>

            {/* Selected Date Reminders Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {MONTH_NAMES[viewMonth]} {selectedDate}, {viewYear}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedDateReminders.length === 0 ? 'No reminders' : `${selectedDateReminders.length} reminder${selectedDateReminders.length > 1 ? 's' : ''}`}
                        </p>
                    </div>

                    <button
                        onClick={openNewForm}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2B6BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Reminder</span>
                    </button>
                </div>

                {/* Reminder Cards List */}
                <div className="space-y-2.5">
                    {selectedDateReminders.map((rem) => {
                        const isDone = !!rem.is_completed
                        const accent = rem.color || '#2B6BFF'
                        const remTag = rem.tag || rem.category
                        const catObj = CATEGORIES.find(c => c.label === remTag) || CATEGORIES[1]

                        return (
                            <div
                                key={rem.id}
                                className="flex items-center gap-3 p-3.5 bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-2xl shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 relative overflow-hidden"
                            >
                                {/* Left Inset Color Bar */}
                                <div
                                    style={{ backgroundColor: accent }}
                                    className="w-1.5 self-stretch rounded-full shrink-0"
                                />

                                {/* Circular Checkbox */}
                                <button
                                    onClick={() => handleToggleComplete(rem)}
                                    style={isDone ? { backgroundColor: accent, borderColor: accent } : undefined}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        isDone ? '' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0B1021]'
                                    }`}
                                    aria-label="Toggle completed"
                                >
                                    {isDone && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                                </button>

                                {/* Title, Description, and Metadata Row */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-semibold truncate ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                            {rem.title}
                                        </span>
                                    </div>

                                    {rem.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                            {rem.description}
                                        </p>
                                    )}

                                    {/* Single-line flex-nowrap metadata row */}
                                    <div className="flex items-center gap-2 mt-1.5 flex-nowrap overflow-x-auto scrollbar-hide text-[11px]">
                                        {/* Tinted Category Pill */}
                                        <span
                                            style={{ color: catObj.color, backgroundColor: `${catObj.color}1F` }}
                                            className="px-2 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0"
                                        >
                                            {remTag || 'General'}
                                        </span>

                                        {/* Time Range */}
                                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                                            <Clock className="w-3 h-3" />
                                            {rem.all_day ? 'All-day' : `${formatTime12(rem.start_time)} - ${formatTime12(rem.end_time)}`}
                                        </span>

                                        {/* Recurrence Pill */}
                                        {rem.repeat && rem.repeat !== 'never' && (
                                            <span className="text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0 capitalize">
                                                • {rem.repeat}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right Actions: Star, Edit, Delete */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => handleToggleStar(rem)}
                                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#0B1021] text-slate-400 transition-colors"
                                        aria-label="Star reminder"
                                    >
                                        <Star className={`w-4 h-4 ${rem.is_starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                                    </button>

                                    <button
                                        onClick={() => openEditForm(rem)}
                                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#0B1021] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                        aria-label="Edit reminder"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={() => handleDeleteReminder(rem)}
                                        className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                                        aria-label="Delete reminder"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Quick-Jump Modal: Step 1 (Year) -> Step 2 (Month) */}
            {showQuickJump && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-sm bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-3xl p-5 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                {jumpStep === 1 ? 'Select Year' : `Select Month (${tempYear})`}
                            </h4>
                            <button
                                onClick={() => setShowQuickJump(false)}
                                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#0B1021] text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {jumpStep === 1 ? (
                            <div className="grid grid-cols-3 gap-2.5">
                                {[2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map((y) => (
                                    <button
                                        key={y}
                                        onClick={() => {
                                            setTempYear(y)
                                            setJumpStep(2)
                                        }}
                                        className={`h-11 rounded-2xl text-sm font-bold transition-all ${
                                            y === viewYear
                                                ? 'bg-[#2B6BFF] text-white shadow-md'
                                                : 'bg-slate-100 dark:bg-[#0B1021] text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                    >
                                        {y}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2.5">
                                {SHORT_MONTHS.map((m, idx) => (
                                    <button
                                        key={m}
                                        onClick={() => {
                                            setViewYear(tempYear)
                                            setViewMonth(idx)
                                            setSelectedDate(1)
                                            setShowQuickJump(false)
                                        }}
                                        className={`h-11 rounded-2xl text-sm font-bold transition-all ${
                                            idx === viewMonth && tempYear === viewYear
                                                ? 'bg-[#2B6BFF] text-white shadow-md'
                                                : 'bg-slate-100 dark:bg-[#0B1021] text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Upgraded Dark-Mode-Native New/Edit Reminder Modal */}
            {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-lg bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto pb-10 space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#222A41]">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingReminder ? 'Edit Reminder' : 'New Reminder'}
                            </h4>
                            <button
                                onClick={() => setShowFormModal(false)}
                                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#0B1021] text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 uppercase tracking-wider">Title</label>
                            <input
                                type="text"
                                value={formTitle}
                                onChange={(e) => { setFormTitle(e.target.value); setFormError('') }}
                                placeholder="e.g. Doctor's Appointment"
                                className="w-full h-11 bg-slate-50 dark:bg-[#0B1021] border border-slate-200 dark:border-[#222A41] rounded-xl px-4 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#2B6BFF]/40"
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 uppercase tracking-wider">Description (Optional)</label>
                            <textarea
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="Add notes or location details..."
                                rows={2}
                                className="w-full bg-slate-50 dark:bg-[#0B1021] border border-slate-200 dark:border-[#222A41] rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#2B6BFF]/40 resize-none"
                            />
                        </div>

                        {/* Category Tag Pills */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wider">Category Tag</label>
                            <div className="flex gap-2 flex-wrap">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.label}
                                        type="button"
                                        onClick={() => {
                                            setFormCategory(cat.label)
                                            setFormColor(cat.color)
                                        }}
                                        style={{
                                            borderColor: formCategory === cat.label ? cat.color : undefined,
                                            backgroundColor: formCategory === cat.label ? `${cat.color}22` : undefined,
                                            color: formCategory === cat.label ? cat.color : undefined,
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                            formCategory === cat.label
                                                ? 'shadow-sm'
                                                : 'border-slate-200 dark:border-[#222A41] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#0B1021]'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color Accent Circular Swatches */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wider">Color Accent</label>
                            <div className="flex gap-2.5 items-center">
                                {COLOR_SWATCHES.map((swatch) => (
                                    <button
                                        key={swatch}
                                        type="button"
                                        onClick={() => setFormColor(swatch)}
                                        style={{ backgroundColor: swatch }}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                            formColor === swatch ? 'ring-2 ring-offset-2 ring-[#2B6BFF] dark:ring-offset-[#151B2E]' : ''
                                        }`}
                                    >
                                        {formColor === swatch && <Check className="w-4 h-4 text-white stroke-[2.5]" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* All-Day Switch & Time Pickers */}
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-[#222A41]">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">All-day event</span>
                                <button
                                    type="button"
                                    onClick={() => setFormAllDay(!formAllDay)}
                                    className={`w-12 h-7 rounded-full p-0.5 transition-colors ${formAllDay ? 'bg-[#2B6BFF]' : 'bg-slate-300 dark:bg-slate-700'}`}
                                >
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${formAllDay ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {!formAllDay && (
                                <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                                    <div>
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Starts</span>
                                        <input
                                            type="time"
                                            value={formStartTime}
                                            onChange={(e) => setFormStartTime(e.target.value)}
                                            className="w-full h-11 bg-slate-50 dark:bg-[#0B1021] border border-slate-200 dark:border-[#222A41] rounded-xl px-3 text-sm font-semibold text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] outline-none focus:ring-2 focus:ring-[#2B6BFF]/40"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Ends</span>
                                        <input
                                            type="time"
                                            value={formEndTime}
                                            onChange={(e) => setFormEndTime(e.target.value)}
                                            className="w-full h-11 bg-slate-50 dark:bg-[#0B1021] border border-slate-200 dark:border-[#222A41] rounded-xl px-3 text-sm font-semibold text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] outline-none focus:ring-2 focus:ring-[#2B6BFF]/40"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Repeat Selector */}
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-[#222A41]">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Repeat</label>
                            <select
                                value={formRepeat}
                                onChange={(e) => setFormRepeat(e.target.value)}
                                className="w-full h-11 bg-slate-50 dark:bg-[#0B1021] border border-slate-200 dark:border-[#222A41] rounded-xl px-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2B6BFF]/40"
                            >
                                {REPEAT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>

                            {formRepeat === 'custom' && (
                                <div className="flex items-center gap-2 animate-fadeIn">
                                    <span className="text-xs text-slate-500">Every</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={formCustomInterval}
                                        onChange={(e) => setFormCustomInterval(Math.max(1, parseInt(e.target.value || '1', 10)))}
                                        className="w-16 h-10 bg-slate-50 dark:bg-[#0B1021] border border-slate-200 dark:border-[#222A41] rounded-xl px-2 text-center text-sm font-bold text-slate-900 dark:text-white"
                                    />
                                    <select
                                        value={formCustomFreq}
                                        onChange={(e: any) => setFormCustomFreq(e.target.value)}
                                        className="h-10 bg-slate-50 dark:bg-[#0B1021] border border-slate-200 dark:border-[#222A41] rounded-xl px-3 text-sm font-semibold text-slate-900 dark:text-white outline-none"
                                    >
                                        <option value="day">Day(s)</option>
                                        <option value="week">Week(s)</option>
                                        <option value="month">Month(s)</option>
                                        <option value="year">Year(s)</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* 3-Stage Notifications Alert Caption */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl text-xs text-[#2B6BFF] leading-relaxed">
                            🔔 <span className="font-semibold">Alerts scheduled:</span> 3 days before, 24h before, and at start time (if time permits).
                        </div>

                        {formError && (
                            <p className="text-xs text-red-500 font-semibold">{formError}</p>
                        )}

                        {/* Save Button */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowFormModal(false)}
                                className="flex-1 h-12 bg-slate-100 dark:bg-[#0B1021] text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveReminder}
                                disabled={formSaving}
                                className="flex-1 h-12 bg-[#2B6BFF] hover:bg-blue-600 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                            >
                                {formSaving ? 'Saving...' : 'Save Reminder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
