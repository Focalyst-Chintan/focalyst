export type UserPlan = 'free' | 'pro_monthly' | 'pro_yearly' | 'lifetime'
export type ProfileType = 'student' | 'professional' | 'freelancer' | 'creator' | 'entrepreneur'
export type Priority = 'high' | 'medium' | 'low'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending'
export type ChatRole = 'user' | 'assistant'
export type TabContext = 'plan' | 'focus' | 'notes' | 'insights'

export interface User {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    profile_type: ProfileType | null
    plan: UserPlan
    plan_expires_at: string | null
    onboarding_done: boolean
    created_at: string
    updated_at: string
}


export interface Task {
    id: string
    user_id: string
    title: string
    description: string | null
    due_date: string | null
    due_time: string | null
    priority: Priority
    is_flagged: boolean
    is_completed: boolean
    completed_at: string | null
    reminder_time: string | null
    tags: string[] | null
    created_at: string
    updated_at: string
    subtasks?: Subtask[]
}

export interface Subtask {
    id: string
    task_id: string
    user_id: string
    title: string
    is_completed: boolean
    completed_at: string | null
    position: number
    created_at: string
}

export interface Habit {
    id: string
    user_id: string
    name: string
    icon: string
    frequency: 'daily' | 'custom'
    custom_days: number[] | null
    reminder_time: string | null
    current_streak: number
    longest_streak: number
    is_active: boolean
    position: number
    created_at: string
    updated_at: string
    completed_today?: boolean
}

export interface HabitLog {
    id: string
    habit_id: string
    user_id: string
    completed_date: string
    created_at: string
}

export interface PomodoroSession {
    id: string
    user_id: string
    task_id: string | null
    focus_minutes: number
    break_minutes: number
    sets_planned: number
    sets_completed: number
    was_completed: boolean
    started_at: string
    completed_at: string
    created_at: string
}

export interface Note {
    id: string
    user_id: string
    title: string
    content: string | null
    is_favourite: boolean
    folder: string | null
    note_type?: 'text' | 'voice'
    transcript?: string | null
    duration_seconds?: number | null
    created_at: string
    updated_at: string
}

export interface Countdown {
    id: string
    user_id: string
    event_name: string
    target_date: string
    icon: string
    color: string
    is_active: boolean
    created_at: string
    days_remaining?: number
}

export interface Subscription {
    id: string
    user_id: string
    plan: Exclude<UserPlan, 'free'>
    status: SubscriptionStatus
    polar_subscription_id: string | null
    polar_order_id: string | null
    amount_paise: number
    currency: string
    started_at: string
    expires_at: string | null
    cancelled_at: string | null
    created_at: string
}

export interface AIChatLog {
    id: string
    user_id: string
    role: ChatRole
    content: string
    tab_context: TabContext | null
    tokens_used: number | null
    created_at: string
}
