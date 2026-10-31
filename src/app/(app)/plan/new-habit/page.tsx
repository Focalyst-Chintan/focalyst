'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlan } from '@/context/PlanContext'
import { HexColorPicker } from 'react-colorful'
import { Palette, Check, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const PRESET_ICONS = ['💧', '🚶‍♂️', '🧘', '📚', '💪', '🎯', '😴']
const RECOMMENDED_COLORS = [
    '#FF6B00', // Focalyst Orange
    '#2B6BFF', // Royal Blue
    '#10B981', // Emerald
    '#8B5CF6', // Purple
    '#EF4444', // Red
]

const DURATION_PILLS = [
    { label: '15m', mins: 15 },
    { label: '30m', mins: 30 },
    { label: '45m', mins: 45 },
    { label: '60m', mins: 60 },
    { label: '90m', mins: 90 },
    { label: '2h', mins: 120 },
]

function formatTime12(timeStr: string): string {
    if (!timeStr) return '7:00 PM'
    const [hStr, mStr] = timeStr.split(':')
    let h = parseInt(hStr || '19', 10)
    const m = mStr || '00'
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${h}:${m} ${ampm}`
}

function addMinutesToTime(timeStr: string, minutes: number): string {
    const [hStr, mStr] = (timeStr || '19:00').split(':')
    const totalMins = (parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + minutes) % (24 * 60)
    const newH = Math.floor(totalMins / 60)
    const newM = totalMins % 60
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

function scheduleBrowserNotification(title: string, body: string, timeStr: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') {
        Notification.requestPermission()
    }
    const [h, m] = (timeStr || '19:00').split(':').map(Number)
    const target = new Date()
    target.setHours(h, m, 0, 0)
    if (target.getTime() <= Date.now()) {
        target.setDate(target.getDate() + 1)
    }
    const delay = target.getTime() - Date.now()
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification(title, { body, icon: '/favicon.ico' })
            }
        }, delay)
    }
}

export default function NewHabitForm() {
    const router = useRouter()
    const { addHabit, refreshData } = usePlan()
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
    const [allDays, setAllDays] = useState(true)
    const [reminders, setReminders] = useState(false)
    const [reminderTime, setReminderTime] = useState('19:00')
    const [durationMins, setDurationMins] = useState(30)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Personalization States
    const [icon, setIcon] = useState('🎯')
    const [color, setColor] = useState('#FF6B00')
    const [showCustomPicker, setShowCustomPicker] = useState(false)

    const isCustomColor = !RECOMMENDED_COLORS.includes(color)

    const toggleDay = (index: number) => {
        setAllDays(false)
        setSelectedDays((prev) => prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index])
    }

    const toggleAllDays = () => {
        if (allDays) { setAllDays(false); setSelectedDays([]) }
        else { setAllDays(true); setSelectedDays([0, 1, 2, 3, 4, 5, 6]) }
    }

    const handleSave = async () => {
        if (saving) return
        const trimmed = name.trim()
        if (!trimmed) { setError('Habit name is required'); return }
        if (trimmed.length < 2 || trimmed.length > 100) { setError('Name must be 2-100 characters'); return }
        if (selectedDays.length === 0) { setError('Select at least one repeat day'); return }

        setSaving(true)
        setError('')

        // Request notification permission if reminders enabled
        if (reminders && typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                await Notification.requestPermission()
            }
        }

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const formattedReminder = reminders ? `${reminderTime}:00` : null
                const fullPayload = {
                    user_id: user.id,
                    name: trimmed,
                    icon,
                    color,
                    frequency: allDays ? 'daily' : 'custom',
                    custom_days: allDays ? null : selectedDays,
                    reminder_time: formattedReminder,
                    duration_minutes: reminders ? durationMins : null,
                    start_date: startDate || null,
                    end_date: endDate || null,
                    current_streak: 0,
                    longest_streak: 0,
                    is_active: true,
                }

                // Resilient insert: Try full payload first
                let { error: insertErr } = await supabase.from('habits').insert(fullPayload)

                // Fallback if optional schema columns aren't present
                if (insertErr && (insertErr.code === 'PGRST204' || insertErr.message?.toLowerCase().includes('column'))) {
                    const fallbackPayload = {
                        user_id: user.id,
                        name: trimmed,
                        icon,
                        color,
                        frequency: allDays ? 'daily' : 'custom',
                        custom_days: allDays ? null : selectedDays,
                        reminder_time: formattedReminder,
                        current_streak: 0,
                        longest_streak: 0,
                        is_active: true,
                    }
                    const res = await supabase.from('habits').insert(fallbackPayload)
                    insertErr = res.error
                }

                if (insertErr) {
                    throw insertErr
                }
            } else {
                // Local fallback
                await addHabit({
                    name: trimmed,
                    start_date: startDate,
                    end_date: endDate,
                    repeat_days: selectedDays,
                    all_days: allDays,
                    reminders,
                    reminder_time: reminders ? reminderTime : '19:00',
                    current_streak: 0,
                    completed_today: false,
                    completedDates: [],
                    created_at: new Date().toISOString(),
                    icon,
                    color,
                })
            }

            // Schedule browser notifications if active session permits
            if (reminders) {
                scheduleBrowserNotification(
                    `Time for ${trimmed}!`,
                    `Stay consistent with your ${trimmed} habit today.`,
                    reminderTime
                )
                const followUpTime = addMinutesToTime(reminderTime, durationMins)
                scheduleBrowserNotification(
                    `Check-in: ${trimmed}`,
                    `Did you finish your ${trimmed} habit? Tap to mark it complete!`,
                    followUpTime
                )
            }

            await refreshData()
            router.push('/plan')
        } catch (err: any) {
            console.error('Failed to save habit:', err)
            setError(err?.message || 'Failed to save habit. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#0B1021] text-slate-900 dark:text-white transition-colors duration-200 mp-page">
            {/* Uniform Top Header Bar */}
            <div className="pt-6 pb-4 px-5 flex items-center justify-between border-b border-slate-200/60 dark:border-[#222A41] bg-white dark:bg-[#0B1021] sticky top-0 z-20 mp-bar">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-1 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full mp-icon"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mp-form-title">New habit</h1>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="p-1.5 -mr-1 rounded-full hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors disabled:opacity-50 mp-icon mp-save-icon"
                    aria-label="Save habit"
                    title="Save habit"
                >
                    <Check className="w-7 h-7 text-[#FF6B00]" />
                </button>
            </div>

            {/* Form Body */}
            <div className="px-5 py-6 max-w-xl mx-auto space-y-6">
                {/* Name */}
                <div>
                    <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold block mb-2 uppercase tracking-wider mp-label">Habit Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError('') }}
                        placeholder="e.g. Morning Meditation"
                        className="w-full h-12 bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-2xl px-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#FF6B00]/40 transition-all shadow-sm mp-input"
                        maxLength={100}
                        autoFocus
                    />
                </div>

                {/* Choose Icon */}
                <div>
                    <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold block mb-2 uppercase tracking-wider mp-label">Choose Icon</label>
                    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                        {PRESET_ICONS.map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => setIcon(preset)}
                                className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-2xl transition-all active:scale-95 border ${
                                    icon === preset
                                        ? 'bg-orange-50 dark:bg-orange-500/20 border-[#FF6B00] shadow-sm'
                                        : 'bg-white dark:bg-[#151B2E] border-slate-200 dark:border-[#222A41] hover:bg-slate-50'
                                } mp-icon-pick`}
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color Selector */}
                <div>
                    <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold block mb-2 uppercase tracking-wider mp-label">Color Accent</label>
                    <div className="flex gap-3 items-center overflow-x-auto pb-1 scrollbar-hide">
                        {RECOMMENDED_COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => {
                                    setColor(c)
                                    setShowCustomPicker(false)
                                }}
                                style={{ backgroundColor: c }}
                                className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm ${
                                    color === c ? 'ring-2 ring-offset-2 ring-[#FF6B00] dark:ring-offset-[#0B1021]' : ''
                                } mp-swatch`}
                            >
                                {color === c && <Check className="w-5 h-5 text-white stroke-[2.5]" />}
                            </button>
                        ))}

                        <button
                            type="button"
                            onClick={() => setShowCustomPicker(!showCustomPicker)}
                            style={isCustomColor ? { background: color } : undefined}
                            className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm border-2 border-dashed ${
                                isCustomColor
                                    ? 'border-transparent text-white ring-2 ring-offset-2 ring-[#FF6B00] dark:ring-offset-[#0B1021]'
                                    : 'bg-white dark:bg-[#151B2E] border-slate-300 dark:border-slate-600 text-slate-500'
                            }`}
                        >
                            <Palette className="w-5 h-5" />
                        </button>
                    </div>

                    {showCustomPicker && (
                        <div className="mt-3 p-4 bg-white dark:bg-[#151B2E] rounded-2xl shadow-xl border border-slate-200 dark:border-[#222A41] max-w-[260px] mp-section">
                            <HexColorPicker color={color} onChange={setColor} />
                            <div className="mt-3 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700" style={{ backgroundColor: color }} />
                                <input
                                    type="text"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-full text-xs font-mono uppercase bg-slate-50 dark:bg-[#0B1021] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 outline-none text-slate-900 dark:text-white mp-input"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Repeat Days */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mp-label">Repeat Days</span>
                        <button
                            type="button"
                            onClick={toggleAllDays}
                            className="text-xs font-semibold text-[#FF6B00] hover:underline mp-link"
                        >
                            {allDays ? 'Deselect all' : 'Every day'}
                        </button>
                    </div>
                    <div className="flex gap-2">
                        {DAYS.map((day, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => toggleDay(i)}
                                className={`flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
                                    selectedDays.includes(i)
                                        ? 'bg-[#FF6B00] text-white shadow-sm'
                                        : 'bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] text-slate-700 dark:text-slate-300'
                                } mp-choice`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dual Reminders & Duration Selector */}
                <div className="p-4 bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-2xl shadow-sm space-y-4 mp-section">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white block mp-text-ink">Get reminders</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mp-text-2">Receive dual check-in notifications</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setReminders(!reminders)}
                            className={`w-12 h-7 rounded-full p-0.5 transition-colors ${reminders ? 'bg-[#FF6B00]' : 'bg-slate-300 dark:bg-slate-700'} mp-switch`}
                        >
                            <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${reminders ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {reminders && (
                        <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-[#222A41] animate-fadeIn">
                            <div>
                                <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold block mb-1.5 uppercase tracking-wider mp-label">Reminder Time</label>
                                <input
                                    type="time"
                                    value={reminderTime}
                                    onChange={(e) => setReminderTime(e.target.value)}
                                    className="w-full h-11 bg-slate-50 dark:bg-[#0B1021] border border-slate-200 dark:border-[#222A41] rounded-xl px-4 text-sm font-semibold text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] outline-none focus:ring-2 focus:ring-[#FF6B00]/40 mp-input"
                                />
                            </div>

                            <div>
                                <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold block mb-2 uppercase tracking-wider mp-label">Duration (Follow-Up Check-In)</label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {DURATION_PILLS.map((pill) => (
                                        <button
                                            key={pill.label}
                                            type="button"
                                            onClick={() => setDurationMins(pill.mins)}
                                            className={`h-9 rounded-xl text-xs font-bold transition-all ${
                                                durationMins === pill.mins
                                                    ? 'bg-[#FF6B00] text-white shadow-sm'
                                                    : 'bg-slate-100 dark:bg-[#0B1021] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                                            } mp-choice`}
                                        >
                                            {pill.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dynamic Helper Caption */}
                            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0B1021] p-3 rounded-xl border border-slate-200/60 dark:border-[#222A41] leading-relaxed mp-text-2">
                                🔔 <span className="font-semibold text-slate-700 dark:text-slate-200">1st reminder</span> at {formatTime12(reminderTime)} • <span className="font-semibold text-slate-700 dark:text-slate-200">Follow-up check-in</span> at {formatTime12(addMinutesToTime(reminderTime, durationMins))} asking if you finished.
                            </p>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl mp-error">
                        {error}
                    </div>
                )}

                {/* Bottom Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full h-12 bg-[#FF6B00] hover:bg-[#FF751F] text-white text-[15px] font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mp-save mp-save-sticky"
                >
                    {saving ? 'Saving habit...' : 'Save habit'}
                </button>
            </div>
        </div>
    )
}
