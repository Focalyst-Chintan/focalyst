'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// ── Types ──
export interface TaskItem {
    id: string
    title: string
    is_completed: boolean
    start_date: string
    end_date: string
    tags: string[]
    priority: 1 | 2 | 3
    reminders: boolean
}

export interface HabitItem {
    id: string
    name: string
    current_streak: number
    completed_today: boolean
    start_date: string
    end_date: string
    repeat_days: number[]
    all_days: boolean
    reminders: boolean
    reminder_time: string
}

export interface Reminder {
    id: string
    title: string
    date: string        // YYYY-MM-DD
    start_time: string  // HH:mm
    end_time: string    // HH:mm
    all_day: boolean
    repeat: 'never' | 'daily' | 'weekly' | 'monthly'
}

interface PlanContextType {
    tasks: TaskItem[]
    habits: HabitItem[]
    reminders: Reminder[]
    addTask: (task: Omit<TaskItem, 'id'>) => void
    updateTask: (id: string, updates: Partial<TaskItem>) => void
    deleteTask: (id: string) => void
    reorderTasks: (newOrder: TaskItem[]) => void
    addHabit: (habit: Omit<HabitItem, 'id'>) => void
    updateHabit: (id: string, updates: Partial<HabitItem>) => void
    deleteHabit: (id: string) => void
    addReminder: (reminder: Omit<Reminder, 'id'>) => void
    updateReminder: (id: string, updates: Partial<Reminder>) => void
    deleteReminder: (id: string) => void
    getRemindersForDate: (dateStr: string) => Reminder[]
    getTodayEventCount: () => number
}

const PlanContext = createContext<PlanContextType | null>(null)

let nextId = 100

function genId(): string {
    return String(nextId++)
}

function todayStr(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Mock Data ──
const INITIAL_TASKS: TaskItem[] = [
    { id: '1', title: 'Study Thermodynamics', is_completed: false, start_date: '', end_date: '', tags: [], priority: 2, reminders: false },
    { id: '2', title: 'Solve PYQ', is_completed: false, start_date: '', end_date: '', tags: [], priority: 2, reminders: false },
    { id: '3', title: 'Buy notebooks', is_completed: false, start_date: '', end_date: '', tags: [], priority: 1, reminders: false },
]

const INITIAL_HABITS: HabitItem[] = [
    { id: '10', name: 'Morning walk', current_streak: 3, completed_today: false, start_date: '', end_date: '', repeat_days: [0, 1, 2, 3, 4], all_days: false, reminders: false, reminder_time: '07:00' },
    { id: '11', name: 'Gym', current_streak: 5, completed_today: false, start_date: '', end_date: '', repeat_days: [0, 1, 2, 3, 4, 5, 6], all_days: true, reminders: false, reminder_time: '07:00' },
]

const INITIAL_REMINDERS: Reminder[] = [
    { id: '50', title: 'Team standup', date: todayStr(), start_time: '10:00', end_time: '10:30', all_day: false, repeat: 'daily' },
    { id: '51', title: 'Submit assignment', date: todayStr(), start_time: '14:00', end_time: '15:00', all_day: false, repeat: 'never' },
]

export function PlanProvider({ children }: { children: ReactNode }) {
    const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS)
    const [habits, setHabits] = useState<HabitItem[]>(INITIAL_HABITS)
    const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS)

    const addTask = (task: Omit<TaskItem, 'id'>) => {
        setTasks((prev) => [...prev, { ...task, id: genId() }])
    }

    const updateTask = (id: string, updates: Partial<TaskItem>) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
    }

    const deleteTask = (id: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== id))
    }

    const reorderTasks = (newOrder: TaskItem[]) => {
        setTasks(newOrder)
    }

    const addHabit = (habit: Omit<HabitItem, 'id'>) => {
        setHabits((prev) => [...prev, { ...habit, id: genId() }])
    }

    const updateHabit = (id: string, updates: Partial<HabitItem>) => {
        setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)))
    }

    const deleteHabit = (id: string) => {
        setHabits((prev) => prev.filter((h) => h.id !== id))
    }

    const addReminder = (reminder: Omit<Reminder, 'id'>) => {
        setReminders((prev) => [...prev, { ...reminder, id: genId() }])
    }

    const updateReminder = (id: string, updates: Partial<Reminder>) => {
        setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
    }

    const deleteReminder = (id: string) => {
        setReminders((prev) => prev.filter((r) => r.id !== id))
    }

    const getRemindersForDate = (dateStr: string) => {
        const queryDate = new Date(dateStr + 'T00:00:00')
        return reminders.filter((r) => {
            const reminderDate = new Date(r.date + 'T00:00:00')
            // Must be on or after the original date
            if (queryDate < reminderDate) return false

            if (r.repeat === 'never') {
                return r.date === dateStr
            }
            if (r.repeat === 'daily') {
                return true // every day from the start date
            }
            if (r.repeat === 'weekly') {
                const diffTime = queryDate.getTime() - reminderDate.getTime()
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
                return diffDays % 7 === 0
            }
            if (r.repeat === 'monthly') {
                return queryDate.getDate() === reminderDate.getDate()
            }
            return false
        })
    }

    const getTodayEventCount = () => {
        return getRemindersForDate(todayStr()).length
    }

    return (
        <PlanContext.Provider
            value={{
                tasks, habits, reminders,
                addTask, updateTask, deleteTask, reorderTasks,
                addHabit, updateHabit, deleteHabit,
                addReminder, updateReminder, deleteReminder,
                getRemindersForDate, getTodayEventCount,
            }}
        >
            {children}
        </PlanContext.Provider>
    )
}

export function usePlan() {
    const ctx = useContext(PlanContext)
    if (!ctx) throw new Error('usePlan must be used within a PlanProvider')
    return ctx
}
