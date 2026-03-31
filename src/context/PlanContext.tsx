'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase'

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
    position?: number
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
    completedDates: string[] // Array of 'YYYY-MM-DD' strings for the current year
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
    addHabit: (habit: Omit<HabitItem, 'id'>) => void
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
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Mock Data (fallback when Supabase is unavailable) ──
const MOCK_TASKS: TaskItem[] = [
    { id: '1', title: 'Study Thermodynamics', is_completed: false, start_date: '', end_date: '', tags: [], priority: 2, reminders: false },
    { id: '2', title: 'Solve PYQ', is_completed: false, start_date: '', end_date: '', tags: [], priority: 2, reminders: false },
    { id: '3', title: 'Buy notebooks', is_completed: false, start_date: '', end_date: '', tags: [], priority: 1, reminders: false },
]

const MOCK_HABITS: HabitItem[] = [
    { id: '10', name: 'Morning walk', current_streak: 3, completed_today: false, start_date: '', end_date: '', repeat_days: [0, 1, 2, 3, 4], all_days: false, reminders: false, reminder_time: '07:00', completedDates: [] },
    { id: '11', name: 'Gym', current_streak: 5, completed_today: false, start_date: '', end_date: '', repeat_days: [0, 1, 2, 3, 4, 5, 6], all_days: true, reminders: false, reminder_time: '07:00', completedDates: [] },
]

const MOCK_REMINDERS: Reminder[] = [
    { id: '50', title: 'Team standup', date: todayStr(), start_time: '10:00', end_time: '10:30', all_day: false, repeat: 'daily' },
    { id: '51', title: 'Submit assignment', date: todayStr(), start_time: '14:00', end_time: '15:00', all_day: false, repeat: 'never' },
]

// ── Priority mapping: DB uses 'high'|'medium'|'low', UI uses 1|2|3 ──
function priorityToNumber(p: string): 1 | 2 | 3 {
    if (p === 'high') return 1
    if (p === 'low') return 3
    return 2
}

function numberToPriority(n: 1 | 2 | 3): string {
    if (n === 1) return 'high'
    if (n === 3) return 'low'
    return 'medium'
}

export function PlanProvider({ children }: { children: ReactNode }) {
    const [tasks, setTasks] = useState<TaskItem[]>([])
    const [habits, setHabits] = useState<HabitItem[]>([])
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [useSupabase, setUseSupabase] = useState(true)

    // ── Fetch data from Supabase or fallback to mock ──
    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                // No authenticated user — use mock data
                setUseSupabase(false)
                setTasks(MOCK_TASKS)
                setHabits(MOCK_HABITS)
                setReminders(MOCK_REMINDERS)
                setLoading(false)
                return
            }

            // ── Fetch tasks (incomplete, paginated to 20) ──
            const { data: taskData, error: taskError } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_completed', false)
                .order('created_at', { ascending: false })
                .limit(20)

            if (taskError) throw taskError

            const mappedTasks: TaskItem[] = (taskData || []).map((t) => ({
                id: t.id,
                title: t.title,
                is_completed: t.is_completed,
                start_date: t.due_date || '',
                end_date: t.due_date || '',
                tags: t.tags || [],
                priority: priorityToNumber(t.priority),
                reminders: !!t.reminder_time,
            }))

            // ── Fetch habits (active, paginated to 20) ──
            const { data: habitData, error: habitError } = await supabase
                .from('habits')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('position', { ascending: true })
                .limit(20)

            if (habitError) throw habitError

            // Fetch all habit_logs for the current year (for the contribution graph)
            const habitIds = (habitData || []).map((h) => h.id)
            let todayCompletions: string[] = []
            // Map of habitId -> array of completed date strings
            const yearCompletions: Record<string, string[]> = {}

            if (habitIds.length > 0) {
                const year = new Date().getFullYear()
                const yearStart = `${year}-01-01`
                const yearEnd = `${year}-12-31`

                const { data: logData } = await supabase
                    .from('habit_logs')
                    .select('habit_id, completed_date')
                    .in('habit_id', habitIds)
                    .gte('completed_date', yearStart)
                    .lte('completed_date', yearEnd)

                const today = todayStr()
                for (const log of logData || []) {
                    if (log.completed_date === today) {
                        todayCompletions.push(log.habit_id)
                    }
                    if (!yearCompletions[log.habit_id]) {
                        yearCompletions[log.habit_id] = []
                    }
                    yearCompletions[log.habit_id].push(log.completed_date)
                }
            }

            const mappedHabits: HabitItem[] = (habitData || []).map((h) => ({
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
                completedDates: yearCompletions[h.id] || [],
            }))

            setTasks(mappedTasks)
            setHabits(mappedHabits)
            // Reminders stay local for now (no reminders table in schema)
            setReminders(MOCK_REMINDERS)
            setUseSupabase(true)
        } catch (err) {
            console.error('PlanContext fetch error:', err)
            // Fallback to mock data on any error
            setUseSupabase(false)
            setTasks(MOCK_TASKS)
            setHabits(MOCK_HABITS)
            setReminders(MOCK_REMINDERS)
            setError('Could not load your data. Showing sample data.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // ── Midnight Refresh Logic ──
    useEffect(() => {
        const scheduleNextMidnight = () => {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const timeUntilMidnight = tomorrow.getTime() - now.getTime();

            // Schedule refresh exactly at midnight
            const timeoutId = setTimeout(() => {
                console.log('Midnight reached, refreshing data...');
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
                        priority: numberToPriority(task.priority),
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
                    priority: priorityToNumber(data.priority),
                    reminders: !!data.reminder_time,
                }, ...prev])
                return
            } catch (err) {
                console.error('Failed to add task:', err)
                setError('Failed to save task. Please try again.')
            }
        }
        // Fallback: local state
        setTasks((prev) => [...prev, { ...task, id: genId() }])
    }

    const updateTask = async (id: string, updates: Partial<TaskItem>) => {
        // Optimistic local update
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))

        if (useSupabase) {
            try {
                const supabase = createClient()
                const dbUpdates: Record<string, unknown> = {}
                if (updates.title !== undefined) dbUpdates.title = updates.title.trim()
                if (updates.is_completed !== undefined) {
                    dbUpdates.is_completed = updates.is_completed
                    dbUpdates.completed_at = updates.is_completed ? new Date().toISOString() : null
                }
                if (updates.priority !== undefined) dbUpdates.priority = numberToPriority(updates.priority)
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
            } catch (err) {
                console.error('Failed to update task:', err)
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
                }])
                return
            } catch (err) {
                console.error('Failed to add habit:', err)
                setError('Failed to save habit. Please try again.')
            }
        }
        setHabits((prev) => [...prev, { ...habit, id: genId() }])
    }

    const updateHabit = async (id: string, updates: Partial<HabitItem>) => {
        // Handle habit completion toggle separately
        if (updates.completed_today !== undefined) {
            const habit = habits.find((h) => h.id === id)
            if (!habit) return

            // Optimistic update
            setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, completed_today: updates.completed_today! } : h)))

            if (useSupabase) {
                try {
                    const supabase = createClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return

                    if (updates.completed_today) {
                        // Insert habit_log for today
                        await supabase
                            .from('habit_logs')
                            .upsert({
                                habit_id: id,
                                user_id: user.id,
                                completed_date: todayStr(),
                            }, { onConflict: 'habit_id,completed_date' })

                        // Increment streak
                        await supabase
                            .from('habits')
                            .update({
                                current_streak: (habit.current_streak || 0) + 1,
                            })
                            .eq('id', id)

                        setHabits((prev) => prev.map((h) =>
                            h.id === id ? { ...h, current_streak: h.current_streak + 1 } : h
                        ))
                    } else {
                        // Delete today's habit_log
                        await supabase
                            .from('habit_logs')
                            .delete()
                            .eq('habit_id', id)
                            .eq('completed_date', todayStr())

                        // Decrement streak
                        await supabase
                            .from('habits')
                            .update({
                                current_streak: Math.max(0, (habit.current_streak || 0) - 1),
                            })
                            .eq('id', id)

                        setHabits((prev) => prev.map((h) =>
                            h.id === id ? { ...h, current_streak: Math.max(0, h.current_streak - 1) } : h
                        ))
                    }
                } catch (err) {
                    console.error('Failed to toggle habit:', err)
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
