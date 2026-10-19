'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePlan } from '@/context/PlanContext'
import { HexColorPicker } from 'react-colorful'
import { Palette, Check, ChevronLeft } from 'lucide-react'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const PRESET_ICONS = ['💧', '🚶‍♂️', '🧘', '📚', '💪', '🎯', '😴']

const RECOMMENDED_COLORS = [
    '#8B5CF6', // Violet-500
    '#3B82F6', // Blue-500
    '#10B981', // Emerald-500
    '#F59E0B', // Amber-500
    '#EF4444', // Red-500
]

export default function EditHabitPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const habitId = searchParams.get('id') as string
    const { habits, updateHabit } = usePlan()

    const habit = habits.find((h) => h.id === habitId)

    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [selectedDays, setSelectedDays] = useState<number[]>([])
    const [allDays, setAllDays] = useState(false)
    const [reminders, setReminders] = useState(false)
    const [reminderTime, setReminderTime] = useState('07:00')
    const [error, setError] = useState('')

    // Personalization States
    const [icon, setIcon] = useState('🎯')
    const [color, setColor] = useState('#3B82F6')
    const [showCustomPicker, setShowCustomPicker] = useState(false)

    const isCustomColor = !RECOMMENDED_COLORS.includes(color)

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (habit) {
            setName(habit.name)
            setStartDate(habit.start_date || '')
            setEndDate(habit.end_date || '')
            setSelectedDays(habit.repeat_days || [])
            setAllDays(habit.all_days || false)
            setReminders(habit.reminders || false)
            setReminderTime(habit.reminder_time || '07:00')
            if (habit.icon) setIcon(habit.icon)
            if (habit.color) setColor(habit.color)
        }
    }, [habit])

    if (!habit) {
        return (
            <div className="px-5 py-4 min-h-screen bg-page-bg dark:bg-slate-950 transition-colors duration-300">
                <button onClick={() => router.back()} className="mb-4 text-blue-muted hover:text-navy transition-colors" aria-label="Go back">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <p className="text-navy dark:text-slate-200 text-lg font-semibold">Habit not found</p>
            </div>
        )
    }

    const toggleDay = (index: number) => {
        setAllDays(false)
        setSelectedDays((prev) => prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index])
    }

    const toggleAllDays = () => {
        if (allDays) { setAllDays(false); setSelectedDays([]) }
        else { setAllDays(true); setSelectedDays([0, 1, 2, 3, 4, 5, 6]) }
    }

    const handleSave = () => {
        const trimmed = name.trim()
        if (!trimmed) { setError('Habit name is required'); return }
        if (trimmed.length < 2 || trimmed.length > 100) { setError('Name must be 2-100 characters'); return }
        if (selectedDays.length === 0) { setError('Select at least one repeat day'); return }

        updateHabit(habitId, {
            name: trimmed,
            start_date: startDate,
            end_date: endDate,
            repeat_days: selectedDays,
            all_days: allDays,
            reminders,
            reminder_time: reminders ? reminderTime : habit.reminder_time,
            icon,
            color,
        })
        router.push('/plan')
    }

    return (
        <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#0B1021] text-slate-900 dark:text-white transition-colors duration-200">
            {/* Uniform Top Header Bar */}
            <div className="pt-6 pb-4 px-5 flex items-center justify-between border-b border-slate-200/60 dark:border-[#222A41] bg-white dark:bg-[#0B1021] sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-1 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit habit</h1>
                </div>

                <button
                    onClick={handleSave}
                    className="p-1.5 -mr-1 rounded-full hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                    aria-label="Save habit"
                    title="Save habit"
                >
                    <Check className="w-7 h-7 text-[#FF6B00]" />
                </button>
            </div>

            <div className="px-5">

            {/* Layout wrapper for side-by-side on desktop */}
            <div className="flex flex-col md:flex-row md:items-start md:gap-8 mt-4">
                
                {/* Form main fields (Left column) */}
                <div className="flex-1 w-full space-y-5">
                    <div>
                        <label className="text-blue-muted dark:text-slate-400 text-sm font-medium block mb-2">Name your habit</label>
                        <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="e.g. Meditation"
                            className="w-full h-12 bg-card-bg dark:bg-slate-800 rounded-xl px-4 text-sm text-navy dark:text-slate-100 placeholder:text-blue-muted dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-navy/30" maxLength={100} autoFocus />
                    </div>

                    {/* ICON PICKER SECTION */}
                    <div>
                        <label className="text-blue-muted dark:text-slate-400 text-xs font-semibold block mb-2 tracking-wider uppercase">Choose Icon</label>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {PRESET_ICONS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setIcon(preset)}
                                    className={`w-12 h-12 shrink-0 rounded-xl bg-card-bg dark:bg-slate-800 flex items-center justify-center text-2xl transition-all active:scale-95 ${
                                        icon === preset
                                            ? 'ring-2 ring-blue-500 shadow-md bg-white dark:bg-slate-700'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* COLOR SELECTOR SECTION */}
                    <div>
                        <label className="text-blue-muted dark:text-slate-400 text-xs font-semibold block mb-2 tracking-wider uppercase">Color</label>
                        <div className="flex gap-3 items-center overflow-x-auto pb-2 scrollbar-hide">
                            {RECOMMENDED_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                        setColor(c)
                                        setShowCustomPicker(false)
                                    }}
                                    style={{ backgroundColor: c }}
                                    className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm hover:opacity-90 ${
                                        color === c ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900' : ''
                                    }`}
                                >
                                    {color === c && <Check className="w-5 h-5 text-white" />}
                                </button>
                            ))}

                            {/* Color Wheel Button (6th option) */}
                            <button
                                type="button"
                                onClick={() => setShowCustomPicker(!showCustomPicker)}
                                style={isCustomColor ? { background: `linear-gradient(135deg, ${color}, ${color}dd)` } : undefined}
                                className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm border-2 border-dashed ${
                                    isCustomColor
                                        ? 'border-transparent text-white ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900'
                                        : 'bg-card-bg dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-blue-muted dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                <Palette className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Collapsible custom color wheel picker */}
                        {showCustomPicker && (
                            <div className="mt-3 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 max-w-[250px] animate-fadeIn">
                                <HexColorPicker color={color} onChange={setColor} />
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded border border-slate-200 dark:border-slate-700" style={{ backgroundColor: color }} />
                                    <input
                                        type="text"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-full text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none text-navy dark:text-slate-200"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Additional fields (Right column on desktop) */}
                <div className="flex-1 w-full mt-5 md:mt-0 space-y-5">
                    <div>
                        <label className="text-blue-muted dark:text-slate-400 text-sm font-medium block mb-2">Set a goal</label>
                        <div className="flex gap-3">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 h-12 bg-card-bg dark:bg-slate-800 rounded-xl px-4 text-sm text-navy dark:text-slate-100 outline-none focus:ring-2 focus:ring-navy/30" />
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 h-12 bg-card-bg dark:bg-slate-800 rounded-xl px-4 text-sm text-navy dark:text-slate-100 outline-none focus:ring-2 focus:ring-navy/30" />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-muted dark:text-slate-400 text-sm font-medium">Repeat days</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <span className="text-blue-muted dark:text-slate-400 text-sm">All days</span>
                                <button onClick={toggleAllDays} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${allDays ? 'bg-navy border-navy' : 'border-blue-muted dark:border-slate-600 bg-white dark:bg-slate-700'}`}>
                                    {allDays && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                </button>
                            </label>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {DAYS.map((day, i) => (
                                <button key={i} onClick={() => toggleDay(i)}
                                    className={`w-10 h-10 rounded-full text-[13px] font-semibold flex items-center justify-center transition-all ${selectedDays.includes(i) ? 'bg-navy text-white' : 'bg-card-bg dark:bg-slate-800 text-navy dark:text-slate-300'}`}>{day}</button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                        <span className="text-blue-muted dark:text-slate-400 text-sm font-medium">Get reminders</span>
                        <button onClick={() => setReminders(!reminders)} className={`w-12 h-7 rounded-full p-0.5 transition-colors ${reminders ? 'bg-navy' : 'bg-card-bg dark:bg-slate-800'}`}>
                            <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${reminders ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {reminders && (
                        <div className="mt-2 animate-fadeIn">
                            <label className="text-blue-muted dark:text-slate-400 text-xs block mb-1">Select time</label>
                            <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
                                className="h-10 bg-card-bg dark:bg-slate-800 rounded-xl px-4 text-sm text-navy dark:text-slate-100 outline-none focus:ring-2 focus:ring-navy/30" />
                        </div>
                    )}
                </div>
            </div>

            {error && <p className="text-red-500 text-xs mt-4">{error}</p>}

            <button onClick={handleSave} className="w-full h-12 bg-accent text-white text-[15px] font-semibold rounded-xl mt-6 transition-all active:scale-[0.98] hover:bg-accent-dark">
                Save changes
            </button>
            </div>
        </div>
    )
}
