'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlan } from '@/context/PlanContext'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function NewHabitForm() {
    const router = useRouter()
    const { addHabit } = usePlan()
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [selectedDays, setSelectedDays] = useState<number[]>([])
    const [allDays, setAllDays] = useState(false)
    const [reminders, setReminders] = useState(false)
    const [reminderTime, setReminderTime] = useState('07:00')
    const [error, setError] = useState('')

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

        addHabit({
            name: trimmed,
            start_date: startDate,
            end_date: endDate,
            repeat_days: selectedDays,
            all_days: allDays,
            reminders,
            reminder_time: reminders ? reminderTime : '07:00',
            current_streak: 0,
            completed_today: false,
            completedDates: [],
        })
        router.push('/plan')
    }

    return (
        <div className="px-5 py-4">
            <button onClick={() => router.back()} className="mb-4 text-blue-muted hover:text-navy transition-colors" aria-label="Go back">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>

            <h1 className="text-navy text-[28px] font-bold mb-1">New habit</h1>

            <label className="text-blue-muted text-sm font-medium block mt-4 mb-2">Name your habit</label>
            <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="e.g. Meditation"
                className="w-full h-12 bg-card-bg rounded-xl px-4 text-sm text-navy placeholder:text-blue-muted outline-none focus:ring-2 focus:ring-navy/30" maxLength={100} autoFocus />

            <label className="text-blue-muted text-sm font-medium block mt-5 mb-2">Set a goal</label>
            <div className="flex gap-3">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 h-12 bg-card-bg rounded-xl px-4 text-sm text-navy outline-none focus:ring-2 focus:ring-navy/30" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 h-12 bg-card-bg rounded-xl px-4 text-sm text-navy outline-none focus:ring-2 focus:ring-navy/30" />
            </div>

            <div className="flex items-center justify-between mt-5 mb-2">
                <span className="text-blue-muted text-sm font-medium">Repeat days</span>
                <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-blue-muted text-sm">All days</span>
                    <button onClick={toggleAllDays} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${allDays ? 'bg-navy border-navy' : 'border-blue-muted bg-white'}`}>
                        {allDays && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </button>
                </label>
            </div>
            <div className="flex gap-2">
                {DAYS.map((day, i) => (
                    <button key={i} onClick={() => toggleDay(i)}
                        className={`w-10 h-10 rounded-full text-[13px] font-semibold flex items-center justify-center transition-all ${selectedDays.includes(i) ? 'bg-navy text-white' : 'bg-card-bg text-navy'}`}>{day}</button>
                ))}
            </div>

            <div className="flex items-center justify-between mt-5">
                <span className="text-blue-muted text-sm font-medium">Get reminders</span>
                <button onClick={() => setReminders(!reminders)} className={`w-12 h-7 rounded-full p-0.5 transition-colors ${reminders ? 'bg-navy' : 'bg-card-bg'}`}>
                    <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${reminders ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            </div>

            {reminders && (
                <div className="mt-2">
                    <label className="text-blue-muted text-xs block mb-1">Select time</label>
                    <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
                        className="h-10 bg-card-bg rounded-xl px-4 text-sm text-navy outline-none focus:ring-2 focus:ring-navy/30" />
                </div>
            )}

            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

            <button onClick={handleSave} className="w-full h-12 bg-accent text-white text-[15px] font-semibold rounded-xl mt-6 transition-all active:scale-[0.98] hover:bg-accent-dark">
                Save habit
            </button>
        </div>
    )
}
