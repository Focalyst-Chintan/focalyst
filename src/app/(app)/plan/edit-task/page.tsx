'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePlan, Priority, normalizePriority } from '@/context/PlanContext'
import { ChevronLeft, Check } from 'lucide-react'

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
]

export default function EditTaskPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const taskId = searchParams.get('id') as string
    const { tasks, updateTask } = usePlan()

    const task = tasks.find((t) => t.id === taskId)

    const [title, setTitle] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [tags, setTags] = useState('')
    const [priority, setPriority] = useState<Priority>('medium')
    const [reminders, setReminders] = useState(false)
    const [error, setError] = useState('')

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (task) {
            setTitle(task.title)
            setStartDate(task.start_date)
            setEndDate(task.end_date)
            setTags(task.tags.join(', '))
            setPriority(normalizePriority(task.priority))
            setReminders(task.reminders)
        }
    }, [task])

    if (!task) {
        return (
            <div className="px-5 py-4">
                <button onClick={() => router.back()} className="mb-4 text-blue-muted hover:text-navy transition-colors" aria-label="Go back">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <p className="text-navy text-lg font-semibold">Task not found</p>
            </div>
        )
    }

    const handleSave = () => {
        const trimmed = title.trim()
        if (!trimmed) { setError('Task title is required'); return }
        if (trimmed.length < 2 || trimmed.length > 200) { setError('Title must be 2-200 characters'); return }

        updateTask(taskId, {
            title: trimmed,
            start_date: startDate,
            end_date: endDate,
            tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
            priority,
            reminders,
        })
        router.push('/plan')
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mp-form-title">Edit task</h1>
                </div>

                <button
                    onClick={handleSave}
                    className="p-1.5 -mr-1 rounded-full hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors mp-icon mp-save-icon"
                    aria-label="Save task"
                    title="Save task"
                >
                    <Check className="w-7 h-7 text-[#FF6B00]" />
                </button>
            </div>

            <div className="px-5">

            <label className="text-blue-muted dark:text-slate-400 text-sm font-medium block mt-4 mb-2">Describe</label>
            <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder="What do you need to do?"
                className="w-full h-12 bg-card-bg dark:bg-slate-800 rounded-xl px-4 text-sm text-navy dark:text-slate-100 placeholder:text-blue-muted dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-navy/30" maxLength={200} autoFocus />

            <label className="text-blue-muted dark:text-slate-400 text-sm font-medium block mt-5 mb-2">Set duration</label>
            <div className="flex gap-3">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 h-12 bg-card-bg dark:bg-slate-800 rounded-xl px-4 text-sm text-navy dark:text-slate-100 outline-none focus:ring-2 focus:ring-navy/30" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 h-12 bg-card-bg dark:bg-slate-800 rounded-xl px-4 text-sm text-navy dark:text-slate-100 outline-none focus:ring-2 focus:ring-navy/30" />
            </div>

            <label className="text-blue-muted dark:text-slate-400 text-sm font-medium block mt-5 mb-2">Add Tags</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. study, urgent"
                className="w-full h-12 bg-card-bg dark:bg-slate-800 rounded-xl px-4 text-sm text-navy dark:text-slate-100 placeholder:text-blue-muted dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-navy/30" />

            <label className="text-blue-muted dark:text-slate-400 text-sm font-medium block mt-5 mb-2">Priority level</label>
            <div className="flex items-center gap-3">
                {PRIORITY_OPTIONS.map(({ value, label }) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setPriority(value)}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center justify-center transition-all ${
                            priority === value
                                ? 'bg-navy dark:bg-blue-500 text-white shadow-sm'
                                : 'bg-card-bg dark:bg-slate-800 text-navy dark:text-slate-300 hover:opacity-80'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-between mt-5">
                <span className="text-blue-muted dark:text-slate-400 text-sm font-medium">Get reminders</span>
                <button onClick={() => setReminders(!reminders)} className={`w-12 h-7 rounded-full p-0.5 transition-colors ${reminders ? 'bg-navy' : 'bg-card-bg dark:bg-slate-800'} mp-switch`}>
                    <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${reminders ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            </div>

            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

            <button onClick={handleSave} className="w-full h-12 bg-accent text-white text-[15px] font-semibold rounded-xl mt-6 transition-all active:scale-[0.98] hover:bg-accent-dark mp-save mp-save-sticky">
                Save changes
            </button>
            </div>
        </div>
    )
}
