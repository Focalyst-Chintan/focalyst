'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TodoList from '@/components/plan/TodoList'
import HabitList from '@/components/plan/HabitList'

type TabView = 'today' | 'calendar'

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}

function getFormattedDate(): { day: string; month: string; weekday: string } {
    const now = new Date()
    const day = now.getDate().toString()
    const month = now.toLocaleString('en-US', { month: 'short' })
    const weekday = now.toLocaleString('en-US', { weekday: 'long' })
    return { day, month, weekday }
}

export default function PlanPage() {
    const [activeTab, setActiveTab] = useState<TabView>('today')
    const router = useRouter()
    const date = getFormattedDate()
    const greeting = getGreeting()

    // TODO: Replace with actual user name from Supabase
    const userName = 'Rahul'

    return (
        <div className="px-5 py-4">
            {/* Greeting */}
            <h1 className="text-navy text-xl font-semibold">
                {greeting}, {userName}
            </h1>

            {/* Tab Toggle */}
            <div className="flex gap-2 mt-3 mb-4">
                <button
                    onClick={() => setActiveTab('today')}
                    className={`px-5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${activeTab === 'today'
                            ? 'bg-navy text-white'
                            : 'bg-card-bg text-navy'
                        }`}
                >
                    TODAY
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`px-5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${activeTab === 'calendar'
                            ? 'bg-navy text-white'
                            : 'bg-card-bg text-navy'
                        }`}
                >
                    CALENDAR
                </button>
            </div>

            {activeTab === 'today' ? (
                <>
                    {/* Date Display */}
                    <div className="flex items-baseline justify-between mb-5">
                        <div>
                            <span className="text-navy text-[42px] font-bold leading-none">
                                {date.day}
                            </span>
                            <span className="text-navy text-[42px] font-light ml-1">
                                {date.month}
                            </span>
                            <p className="text-blue-muted text-xs mt-0.5">{date.weekday}</p>
                        </div>
                        <span className="text-blue-muted text-sm">No events</span>
                    </div>

                    {/* TO-DO List */}
                    <TodoList onAddTask={() => router.push('/plan/new-task')} />

                    {/* Spacer */}
                    <div className="h-6" />

                    {/* My Habits */}
                    <HabitList onAddHabit={() => router.push('/plan/new-habit')} />
                </>
            ) : (
                /* Calendar placeholder */
                <div className="flex items-center justify-center h-60 bg-card-bg rounded-xl">
                    <p className="text-blue-muted text-sm">Calendar view coming soon</p>
                </div>
            )}
        </div>
    )
}
