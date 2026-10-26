'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { FREE_TIER_LIMITS, isFreePlan } from '@/lib/featureGates'
import { localDateStr } from '@/lib/utils/date'
import { onDataChanged, emitDataChanged } from '@/lib/events'
import { awardXP } from '@/lib/xp/award'
import { useData } from '@/lib/data/useData'
import { useSWRConfig } from 'swr'
import { useToast } from '@/components/desktop/ui/Toast'

// ── Types ──
export interface TaskItem {
    id: string
    title: string
    is_completed: boolean
    start_date: string
    end_date: string
    tags: string[]
    priority: Priority
    reminders: boolean
    position?: number
    completed_at?: string | null
    due_date?: string | null
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
    position?: number
    completedDates: string[] // Array of 'YYYY-MM-DD' strings from creation date
    created_at: string // ISO timestamp of habit creation
    icon?: string
    color?: string
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
    loading: boolean
    error: string | null
    addTask: (task: Omit<TaskItem, 'id'>) => void
    updateTask: (id: string, updates: Partial<TaskItem>) => void
    deleteTask: (id: string) => void
    reorderTasks: (newOrder: TaskItem[]) => void
    addHabit: (habit: Omit<HabitItem, 'id'>) => Promise<boolean>
    updateHabit: (id: string, updates: Partial<HabitItem>) => void
    deleteHabit: (id: string) => void
    addReminder: (reminder: Omit<Reminder, 'id'>) => void
    updateReminder: (id: string, updates: Partial<Reminder>) => void
    deleteReminder: (id: string) => void
    getRemindersForDate: (dateStr: string) => Reminder[]
    getTodayEventCount: () => number
    refreshData: () => Promise<void>
}

const PlanContext = createContext<PlanContextType | null>(null)

let nextId = 100

function genId(): string {
    return String(nextId++)
}

function todayStr(): string {
    return localDateStr()
}

// ── Mock Data (fallback when Supabase is unavailable) ──
const MOCK_TASKS: TaskItem[] = []

const MOCK_HABITS: HabitItem[] = []

const MOCK_REMINDERS: Reminder[] = []


export type Priority = 'high' | 'medium' | 'low'

export const PRIORITY_WEIGHT: Record<Priority, number> = {
    high: 1,
    medium: 2,
    low: 3,
}

export function normalizePriority(value: unknown): Priority {
    if (value === 'high' || value === 1 || value === '1') return 'high'
    if (value === 'low' || value === 3 || value === '3') return 'low'
    return 'medium'
}

export function PlanProvider({ children }: { children: ReactNode }) {
    const router = useRouter()
    const { user, plan } = useAuth()
    const { mutate } = useSWRConfig()
    const toast = useToast()
    const [tasks, setTasks] = useState<TaskItem[]>([])
    const [habits, setHabits] = useState<HabitItem[]>([])
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [useSupabase, setUseSupabase] = useState(true)

    // ── Fetchers for SWR ──
    const fetchTasksFromDb = useCallback(async (): Promise<TaskItem[]> => {
        if (!user) return MOCK_TASKS
        const supabase = createClient()
        const { data: taskData, error: taskError } = await supabase
            .from('tasks')
            .select('id, title, is_completed, due_date, completed_at, tags, priority, reminder_time')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100)

        if (taskError) {
            console.error("[SUPABASE FETCH ERROR]:", taskError.message, taskError.details)
            throw taskError
        }

        return (taskData || []).map((t: any) => ({
            id: t.id,
            title: t.title,
            is_completed: t.is_completed,
            start_date: t.due_date || '',
            end_date: t.due_date || '',
            due_date: t.due_date || null,
            completed_at: t.completed_at || null,
            tags: t.tags || [],
            priority: normalizePriority(t.priority),
            reminders: !!t.reminder_time,
        }))
    }, [user])

    const fetchHabitsFromDb = useCallback(async (): Promise<HabitItem[]> => {
        if (!user) return MOCK_HABITS
        const supabase = createClient()
        const { data: habitData, error: habitError } = await supabase
            .from('habits')
            .select('id, name, current_streak, frequency, custom_days, reminder_time, position, created_at, icon, color')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('position', { ascending: true })
            .limit(20)

        if (habitError) {
            console.error("[SUPABASE FETCH ERROR]:", habitError.message, habitError.details)
            throw habitError
        }

        const habitIds = (habitData || []).map((h: any) => h.id)
        let todayCompletions: string[] = []
        const habitCompletions: Record<string, string[]> = {}

        if (habitIds.length > 0) {
            const earliestCreated = (habitData || []).reduce((min: string, h: any) => {
                const d = h.created_at ? h.created_at.split('T')[0] : todayStr()
                return d < min ? d : min
            }, todayStr())

            const { data: logData, error: logError } = await supabase
                .from('habit_logs')
                .select('habit_id, completed_date')
                .in('habit_id', habitIds)
                .gte('completed_date', earliestCreated)

            if (logError) {
                console.error("[SUPABASE FETCH ERROR]:", logError.message, logError.details)
                throw logError
            }

            const today = todayStr()
            for (const log of logData || []) {
                if (log.completed_date === today) {
                    todayCompletions.push(log.habit_id)
                }
                if (!habitCompletions[log.habit_id]) {
                    habitCompletions[log.habit_id] = []
                }
                habitCompletions[log.habit_id].push(log.completed_date)
            }
        }

        return (habitData || []).map((h: any) => ({
            id: h.id,
            name: h.name,
            current_streak: h.current_streak,
            completed_today: todayCompletions.includes(h.id),
            start_date: '',
            end_date: '',
            repeat_days: h.custom_days || [0, 1, 2, 3, 4, 5, 6],
            all_days: h.frequency === 'daily',
            reminders: !!h.reminder_time,
            reminder_time: h.reminder_time || '07:00',
            position: h.position,
            completedDates: habitCompletions[h.id] || [],
            created_at: h.created_at || new Date().toISOString(),
            icon: h.icon || '🎯',
            color: h.color || '#3B82F6',
        }))
    }, [user])

    const tasksKey = user ? `tasks:${user.id}` : null
    const habitsKey = user ? `habits:${user.id}` : null

    const { data: cachedTasks, isLoading: tasksLoading, mutate: mutateTasks } = useData<TaskItem[]>(tasksKey, fetchTasksFromDb)
    const { data: cachedHabits, isLoading: habitsLoading, mutate: mutateHabits } = useData<HabitItem[]>(habitsKey, fetchHabitsFromDb)

    useEffect(() => {
        if (!user) {
            setUseSupabase(false)
            setTasks(MOCK_TASKS)
            setHabits(MOCK_HABITS)
            setReminders(MOCK_REMINDERS)
            setLoading(false)
            return
        }
        setUseSupabase(true)
        if (cachedTasks) setTasks(cachedTasks)
        if (cachedHabits) setHabits(cachedHabits)
        setLoading(tasksLoading || habitsLoading)
    }, [user, cachedTasks, cachedHabits, tasksLoading, habitsLoading])

    const fetchData = useCallback(async () => {
        if (!user) return
        await Promise.all([mutateTasks(), mutateHabits()])
    }, [user, mutateTasks, mutateHabits])

    useEffect(() => {
        const unsub = onDataChanged(['task', 'habit', 'reminder'], () => {
            fetchData()
        })
        const handleFocus = () => fetchData()
        window.addEventListener('focus', handleFocus)
        return () => {
            unsub()
            window.removeEventListener('focus', handleFocus)
        }
    }, [fetchData])

    // ── Midnight Refresh Logic ──
    useEffect(() => {
        const scheduleNextMidnight = () => {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const timeUntilMidnight = tomorrow.getTime() - now.getTime();

            // Schedule refresh exactly at midnight
            const timeoutId = setTimeout(() => {

                fetchData();
                scheduleNextMidnight(); // Schedule for next night
            }, timeUntilMidnight + 1000); // Add 1s buffer

            return timeoutId;
        };

        const timeoutId = scheduleNextMidnight();

        // Also check every hour as a safety measure for hibernation/sleep
        const intervalId = setInterval(() => {
            fetchData();
        }, 60 * 60 * 1000);

        return () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
        };
    }, [fetchData]);

    // ── Task CRUD ──
    const addTask = async (task: Omit<TaskItem, 'id'>) => {
        if (useSupabase) {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) throw new Error('Not authenticated')

                const { data, error: insertError } = await supabase
                    .from('tasks')
                    .insert({
                        user_id: user.id,
                        title: task.title.trim(),
                        due_date: task.start_date || null,
                        priority: normalizePriority(task.priority),
                        reminder_time: task.reminders ? new Date().toISOString() : null,
                        tags: task.tags.length > 0 ? task.tags : null,
                    })
                    .select()
                    .single()

                if (insertError) throw insertError

                setTasks((prev) => [{
                    id: data.id,
                    title: data.title,
                    is_completed: false,
                    start_date: data.due_date || '',
                    end_date: data.due_date || '',
                    tags: data.tags || [],
                    priority: normalizePriority(data.priority),
                    reminders: !!data.reminder_time,
                }, ...prev])
                return
            } catch (err) {
                console.error('Failed to add task:', err)
                setError('Failed to save task. Please try again.')
            }
        }
        // Fallback: local state
        setTasks((prev) => [...prev, { ...task, priority: normalizePriority(task.priority), id: genId() }])
    }

    const updateTask = async (id: string, updates: Partial<TaskItem>) => {
        const applyTaskUpdate = (t: TaskItem): TaskItem => ({
            ...t,
            ...updates,
            ...(updates.priority ? { priority: normalizePriority(updates.priority) } : {}),
        })

        // Local state update
        setTasks((prev) => prev.map((t) => (t.id === id ? applyTaskUpdate(t) : t)))

        if (useSupabase && user) {
            const key = `tasks:${user.id}`
            try {
                await mutate<TaskItem[]>(
                    key,
                    async (current = []) => {
                        const supabase = createClient()
                        const dbUpdates: Record<string, unknown> = {}
                        if (updates.title !== undefined) dbUpdates.title = updates.title.trim()
                        if (updates.is_completed !== undefined) {
                            dbUpdates.is_completed = updates.is_completed
                            dbUpdates.completed_at = updates.is_completed ? new Date().toISOString() : null
                        }
                        if (updates.priority !== undefined) dbUpdates.priority = normalizePriority(updates.priority)
                        if (updates.tags !== undefined) dbUpdates.tags = updates.tags.length > 0 ? updates.tags : null
                        if (updates.start_date !== undefined) dbUpdates.due_date = updates.start_date || null
                        if (updates.reminders !== undefined) {
                            dbUpdates.reminder_time = updates.reminders ? new Date().toISOString() : null
                        }

                        const { error: updateError } = await supabase
                            .from('tasks')
                            .update(dbUpdates)
                            .eq('id', id)

                        if (updateError) throw updateError
                        return current.map((t) => (t.id === id ? applyTaskUpdate(t) : t))
                    },
                    {
                        optimisticData: (current = []) => current.map((t) => (t.id === id ? applyTaskUpdate(t) : t)),
                        rollbackOnError: true,
                        revalidate: false,
                    }
                )

                if (updates.is_completed === true) {
                    awardXP(8, 'Task Completed')
                    emitDataChanged('task')
                }
            } catch (err) {
                console.error('Failed to update task:', err)
                toast.show("Could not save. Check your connection and try again.", 'error')
                setError('Failed to update task.')
            }
        }
    }

    const deleteTask = async (id: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== id))

        if (useSupabase) {
            try {
                const supabase = createClient()
                const { error: deleteError } = await supabase
                    .from('tasks')
                    .delete()
                    .eq('id', id)
                if (deleteError) throw deleteError
            } catch (err) {
                console.error('Failed to delete task:', err)
                setError('Failed to delete task.')
            }
        }
    }

    const reorderTasks = (newOrder: TaskItem[]) => {
        setTasks(newOrder)
        // Position updates for Supabase could be done here but is non-critical
    }

    // ── Habit CRUD ──
    const addHabit = async (habit: Omit<HabitItem, 'id'>) => {
        if (isFreePlan(plan) && habits.length >= FREE_TIER_LIMITS.habits) {
            router.push('/paywall')
            return false
        }

        if (useSupabase) {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) throw new Error('Not authenticated')

                const { data, error: insertError } = await supabase
                    .from('habits')
                    .insert({
                        user_id: user.id,
                        name: habit.name.trim(),
                        frequency: habit.all_days ? 'daily' : 'custom',
                        custom_days: habit.all_days ? null : habit.repeat_days,
                        reminder_time: habit.reminders ? habit.reminder_time : null,
                        position: habits.length,
                        icon: habit.icon || '🎯',
                        color: habit.color || '#3B82F6',
                    })
                    .select()
                    .single()

                if (insertError) throw insertError

                setHabits((prev) => [...prev, {
                    id: data.id,
                    name: data.name,
                    current_streak: 0,
                    completed_today: false,
                    start_date: '',
                    end_date: '',
                    repeat_days: data.custom_days || [0, 1, 2, 3, 4, 5, 6],
                    all_days: data.frequency === 'daily',
                    reminders: !!data.reminder_time,
                    reminder_time: data.reminder_time || '07:00',
                    position: data.position,
                    completedDates: [],
                    created_at: data.created_at || new Date().toISOString(),
                    icon: data.icon || '🎯',
                    color: data.color || '#3B82F6',
                }])
                return true
            } catch (err) {
                console.error('Failed to add habit:', err)
                setError('Failed to save habit. Please try again.')
                return false
            }
        }
        setHabits((prev) => [...prev, { ...habit, id: genId(), icon: habit.icon || '🎯', color: habit.color || '#3B82F6' }])
        return true
    }

    const updateHabit = async (id: string, updates: Partial<HabitItem>) => {
        // Handle habit completion toggle separately
        if (updates.completed_today !== undefined) {
            const habit = habits.find((h) => h.id === id)
            if (!habit) return

            const nextCompleted = updates.completed_today
            const today = todayStr()

            const applyToggle = (h: HabitItem): HabitItem => {
                if (h.id !== id) return h
                const nextStreak = nextCompleted
                    ? (h.current_streak || 0) + 1
                    : Math.max(0, (h.current_streak || 0) - 1)
                const nextCompletedDates = nextCompleted
                    ? Array.from(new Set([...(h.completedDates || []), today]))
                    : (h.completedDates || []).filter((d) => d !== today)
                return {
                    ...h,
                    completed_today: nextCompleted,
                    current_streak: nextStreak,
                    completedDates: nextCompletedDates,
                }
            }

            // Local state update
            setHabits((prev) => prev.map((h) => applyToggle(h)))

            if (useSupabase && user) {
                const key = `habits:${user.id}`
                try {
                    await mutate<HabitItem[]>(
                        key,
                        async (current = []) => {
                            const supabase = createClient()
                            if (nextCompleted) {
                                const { error: upsertErr } = await supabase
                                    .from('habit_logs')
                                    .upsert({
                                        habit_id: id,
                                        user_id: user.id,
                                        completed_date: today,
                                    }, { onConflict: 'habit_id,completed_date' })
                                if (upsertErr) throw upsertErr

                                const { error: habitErr } = await supabase
                                    .from('habits')
                                    .update({ current_streak: (habit.current_streak || 0) + 1 })
                                    .eq('id', id)
                                if (habitErr) throw habitErr
                            } else {
                                const { error: delErr } = await supabase
                                    .from('habit_logs')
                                    .delete()
                                    .eq('habit_id', id)
                                    .eq('completed_date', today)
                                if (delErr) throw delErr

                                const { error: habitErr } = await supabase
                                    .from('habits')
                                    .update({ current_streak: Math.max(0, (habit.current_streak || 0) - 1) })
                                    .eq('id', id)
                                if (habitErr) throw habitErr
                            }
                            return current.map((x) => applyToggle(x))
                        },
                        {
                            optimisticData: (current = []) => current.map((x) => applyToggle(x)),
                            rollbackOnError: true,
                            revalidate: false,
                        }
                    )

                    if (nextCompleted) {
                        awardXP(5, 'Habit Logged')
                    }
                    emitDataChanged('habit')
                } catch (err) {
                    console.error('Failed to toggle habit:', err)
                    toast.show("Could not save. Check your connection and try again.", 'error')
                }
            }
            return
        }

        // General habit field updates
        setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)))

        if (useSupabase) {
            try {
                const supabase = createClient()
                const dbUpdates: Record<string, unknown> = {}
                if (updates.name !== undefined) dbUpdates.name = updates.name.trim()
                if (updates.all_days !== undefined) dbUpdates.frequency = updates.all_days ? 'daily' : 'custom'
                if (updates.repeat_days !== undefined) dbUpdates.custom_days = updates.repeat_days
                if (updates.reminders !== undefined) {
                    dbUpdates.reminder_time = updates.reminders ? (updates.reminder_time || '07:00') : null
                }
                if (updates.icon !== undefined) dbUpdates.icon = updates.icon
                if (updates.color !== undefined) dbUpdates.color = updates.color

                if (Object.keys(dbUpdates).length > 0) {
                    const { error: updateError } = await supabase
                        .from('habits')
                        .update(dbUpdates)
                        .eq('id', id)
                    if (updateError) throw updateError
                }
            } catch (err) {
                console.error('Failed to update habit:', err)
                setError('Failed to update habit.')
            }
        }
    }

    const deleteHabit = async (id: string) => {
        setHabits((prev) => prev.filter((h) => h.id !== id))

        if (useSupabase) {
            try {
                const supabase = createClient()
                const { error: deleteError } = await supabase
                    .from('habits')
                    .delete()
                    .eq('id', id)
                if (deleteError) throw deleteError
            } catch (err) {
                console.error('Failed to delete habit:', err)
                setError('Failed to delete habit.')
            }
        }
    }

    // ── Reminders (local-only, no DB table) ──
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
            if (queryDate < reminderDate) return false

            if (r.repeat === 'never') return r.date === dateStr
            if (r.repeat === 'daily') return true
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

    const refreshData = async () => {
        await fetchData()
    }

    return (
        <PlanContext.Provider
            value={{
                tasks, habits, reminders, loading, error,
                addTask, updateTask, deleteTask, reorderTasks,
                addHabit, updateHabit, deleteHabit,
                addReminder, updateReminder, deleteReminder,
                getRemindersForDate, getTodayEventCount,
                refreshData,
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
