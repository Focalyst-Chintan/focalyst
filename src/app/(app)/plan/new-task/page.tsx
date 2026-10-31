'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlan, Priority } from '@/context/PlanContext'
import { ChevronLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
    { value: 'high', label: 'High', color: 'bg-red-500 text-white' },
    { value: 'medium', label: 'Medium', color: 'bg-[#FF6B00] text-white' },
    { value: 'low', label: 'Low', color: 'bg-blue-500 text-white' },
]

function formatTime12(timeStr: string): string {
    if (!timeStr) return ''
    const [hStr, mStr] = timeStr.split(':')
    let h = parseInt(hStr || '9', 10)
    const m = mStr || '00'
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${h}:${m} ${ampm}`
}

function scheduleBrowserNotification(title: string, body: string, timeStr: string, dateStr?: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') {
        Notification.requestPermission()
    }
    const [h, m] = (timeStr || '09:00').split(':').map(Number)
    const target = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date()
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

export default function NewTaskForm() {
    const router = useRouter()
    const { addTask, refreshData } = usePlan()
    const [title, setTitle] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('10:00')
    const [tags, setTags] = useState('')
    const [priority, setPriority] = useState<Priority>('medium')
    const [reminders, setReminders] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const handleSave = async () => {
        if (saving) return
        const trimmed = title.trim()
        if (!trimmed) { setError('Task title is required'); return }
        if (trimmed.length < 2 || trimmed.length > 200) { setError('Title must be 2-200 characters'); return }

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
            const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)

            if (user) {
                const reminderTimestamp = (reminders && startDate)
                    ? new Date(`${startDate}T${startTime || '09:00'}:00`).toISOString()
                    : null

                const fullPayload = {
                    user_id: user.id,
                    title: trimmed,
                    start_date: startDate || null,
                    end_date: endDate || null,
                    start_time: startTime || null,
                    end_time: endTime || null,
                    tags: tagList,
                    priority,
                    is_completed: false,
                    reminder_time: reminderTimestamp,
                }

                let { error: insertErr } = await supabase.from('tasks').insert(fullPayload)

                // Fallback if optional schema columns aren't supported
                if (insertErr && (insertErr.code === 'PGRST204' || insertErr.message?.toLowerCase().includes('column'))) {
                    const fallbackPayload = {
                        user_id: user.id,
                        title: trimmed,
                        tags: tagList,
                        priority,
                        is_completed: false,
                        reminder_time: reminderTimestamp,
                    }
                    const res = await supabase.from('tasks').insert(fallbackPayload)
                    insertErr = res.error
                }

                if (insertErr) throw insertErr
            } else {
                // Local fallback
                addTask({
                    title: trimmed,
                    start_date: startDate,
                    end_date: endDate,
                    tags: tagList,
                    priority,
                    reminders,
                    is_completed: false,
                })
            }

            // Schedule browser notifications if enabled
            if (reminders) {
                scheduleBrowserNotification(
                    `Starting task: ${trimmed}`,
                    `Time to focus on ${trimmed}.`,
                    startTime,
                    startDate
                )
                scheduleBrowserNotification(
                    `Check-in: ${trimmed}`,
                    `Did you finish ${trimmed}? Mark it complete in Focalyst!`,
                    endTime,
                    endDate || startDate
                )
            }

            await refreshData()
            router.push('/plan')
        } catch (err: any) {
            console.error('Failed to save task:', err)
            setError(err?.message || 'Failed to save task. Please try again.')
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mp-form-title">New task</h1>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="p-1.5 -mr-1 rounded-full hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors disabled:opacity-50 mp-icon mp-save-icon"
                    aria-label="Save task"
                    title="Save task"
                >
                    <Check className="w-7 h-7 text-[#FF6B00]" />
                </button>
            </div>

            {/* Form Body */}
            <div className="px-5 py-6 max-w-xl mx-auto space-y-6">
                {/* Describe */}
                <div>
                    <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold block mb-2 uppercase tracking-wider mp-label">Describe Task</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); setError('') }}
                        placeholder="What do you need to do?"
                        className="w-full h-12 bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-2xl px-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#2B6BFF]/40 transition-all shadow-sm mp-input"
                        maxLength={200}
                        autoFocus
                    />
                </div>

                {/* Duration Dates */}
                <div>
                    <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold block mb-2 uppercase tracking-wider mp-label">Set Duration</label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1 mp-label">Start Date</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-11 bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-xl px-3 text-sm text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] outline-none focus:ring-2 focus:ring-[#2B6BFF]/40 shadow-sm mp-input"
                            />
                        </div>
                        <div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1 mp-label">End Date</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full h-11 bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-xl px-3 text-sm text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] outline-none focus:ring-2 focus:ring-[#2B6BFF]/40 shadow-sm mp-input"
                            />
                        </div>
                    </div>
                </div>

                {/* Priority Level */}
                <div>
                    <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold block mb-2 uppercase tracking-wider mp-label">Priority Level</label>
                    <div className="grid grid-cols-3 gap-2.5">
                        {PRIORITY_OPTIONS.map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setPriority(value)}
                                className={`h-11 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
                                    priority === value
                                        ? 'bg-[#2B6BFF] text-white shadow-sm'
                                        : 'bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                } mp-choice`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dual Start & End Time Reminders */}
                <div className="p-4 bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-2xl shadow-sm space-y-4 mp-section">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white block mp-text-ink">Get reminders</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mp-text-2">Receive start & finish check-in alerts</span>
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
                            <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold block uppercase tracking-wider mp-label">SET TIME</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1 font-medium mp-label">Start Time</span>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full h-11 bg-slate-50 dark:bg-[#0B1021] border border-slate-200 dark:border-[#222A41] rounded-xl px-3 text-sm font-semibold text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] outline-none focus:ring-2 focus:ring-[#2B6BFF]/40 mp-input"
                                    />
                                </div>
                                <div>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1 font-medium mp-label">End Time</span>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full h-11 bg-slate-50 dark:bg-[#0B1021] border border-slate-200 dark:border-[#222A41] rounded-xl px-3 text-sm font-semibold text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] outline-none focus:ring-2 focus:ring-[#2B6BFF]/40 mp-input"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Helper Caption */}
                            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0B1021] p-3 rounded-xl border border-slate-200/60 dark:border-[#222A41] leading-relaxed mp-text-2">
                                🔔 You'll get a notification at <span className="font-semibold text-slate-700 dark:text-slate-200">{formatTime12(startTime)}</span> when it starts and at <span className="font-semibold text-slate-700 dark:text-slate-200">{formatTime12(endTime)}</span> asking if you finished.
                            </p>
                        </div>
                    )}
                </div>

                {/* Add Tags */}
                <div>
                    <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold block mb-2 uppercase tracking-wider mp-label">Add Tags (Optional)</label>
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="e.g. study, urgent, work"
                        className="w-full h-12 bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-2xl px-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#2B6BFF]/40 transition-all shadow-sm mp-input"
                    />
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
                    className="w-full h-12 bg-[#2B6BFF] hover:bg-blue-600 text-white text-[15px] font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mp-save mp-save-sticky"
                >
                    {saving ? 'Saving task...' : 'Save task'}
                </button>
            </div>
        </div>
    )
}
