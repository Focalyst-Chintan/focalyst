'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { usePlan } from '@/context/PlanContext'

type Priority = 1 | 2 | 3

export default function EditTaskPage() {
    const router = useRouter()
    const params = useParams()
    const taskId = params.id as string
    const { tasks, updateTask } = usePlan()

    const task = tasks.find((t) => t.id === taskId)

    const [title, setTitle] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [tags, setTags] = useState('')
    const [priority, setPriority] = useState<Priority>(2)
    const [reminders, setReminders] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (task) {
            setTitle(task.title)
            setStartDate(task.start_date)
            setEndDate(task.end_date)
            setTags(task.tags.join(', '))
            setPriority(task.priority)
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
        <div className="px-5 py-4">
            <button onClick={() => router.back()} className="mb-4 text-blue-muted hover:text-navy transition-colors" aria-label="Go back">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>

            <h1 className="text-navy text-[28px] font-bold mb-1">Edit task</h1>

            <label className="text-blue-muted text-sm font-medium block mt-4 mb-2">Describe</label>
            <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder="What do you need to do?"
                className="w-full h-12 bg-card-bg rounded-xl px-4 text-sm text-navy placeholder:text-blue-muted outline-none focus:ring-2 focus:ring-navy/30" maxLength={200} autoFocus />

            <label className="text-blue-muted text-sm font-medium block mt-5 mb-2">Set duration</label>
            <div className="flex gap-3">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 h-12 bg-card-bg rounded-xl px-4 text-sm text-navy outline-none focus:ring-2 focus:ring-navy/30" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 h-12 bg-card-bg rounded-xl px-4 text-sm text-navy outline-none focus:ring-2 focus:ring-navy/30" />
            </div>

            <label className="text-blue-muted text-sm font-medium block mt-5 mb-2">Add Tags</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. study, urgent"
                className="w-full h-12 bg-card-bg rounded-xl px-4 text-sm text-navy placeholder:text-blue-muted outline-none focus:ring-2 focus:ring-navy/30" />

            <label className="text-blue-muted text-sm font-medium block mt-5 mb-2">Priority level</label>
            <div className="flex items-center gap-3">
                {([1, 2, 3] as Priority[]).map((level) => (
                    <button key={level} onClick={() => setPriority(level)}
                        className={`w-11 h-11 rounded-full text-sm font-bold flex items-center justify-center transition-all ${priority === level ? 'bg-navy text-white' : 'bg-card-bg text-navy'}`}>{level}</button>
                ))}
            </div>

            <div className="flex items-center justify-between mt-5">
                <span className="text-blue-muted text-sm font-medium">Get reminders</span>
                <button onClick={() => setReminders(!reminders)} className={`w-12 h-7 rounded-full p-0.5 transition-colors ${reminders ? 'bg-navy' : 'bg-card-bg'}`}>
                    <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${reminders ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            </div>

            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

            <button onClick={handleSave} className="w-full h-12 bg-accent text-white text-[15px] font-semibold rounded-xl mt-6 transition-all active:scale-[0.98] hover:bg-accent-dark">
                Save changes
            </button>
        </div>
    )
}
