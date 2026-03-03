'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlan } from '@/context/PlanContext'
import TodoList from '@/components/plan/TodoList'
import HabitList from '@/components/plan/HabitList'
import CalendarView from '@/components/plan/CalendarView'

type TabView = 'today' | 'calendar'

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}

function getFormattedDate(): { day: string; month: string; weekday: string } {
    const now = new Date()
    return {
        day: now.getDate().toString(),
        month: now.toLocaleString('en-US', { month: 'short' }),
        weekday: now.toLocaleString('en-US', { weekday: 'long' }),
    }
}

export default function PlanPage() {
    const [activeTab, setActiveTab] = useState<TabView>('today')
    const router = useRouter()
    const { getTodayEventCount } = usePlan()
    const date = getFormattedDate()
    const greeting = getGreeting()
    const eventCount = getTodayEventCount()

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
                    className={`px-5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${activeTab === 'today' ? 'bg-navy text-white' : 'bg-card-bg text-navy'
                        }`}
                >
                    TODAY
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`px-5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${activeTab === 'calendar' ? 'bg-navy text-white' : 'bg-card-bg text-navy'
                        }`}
                >
                    CALENDAR
                </button>
            </div>

            {activeTab === 'today' ? (
                <>
                    {/* Date Display + Event Count */}
                    <div className="flex items-baseline justify-between mb-5">
                        <div>
                            <span className="text-navy text-[42px] font-bold leading-none">{date.day}</span>
                            <span className="text-navy text-[42px] font-light ml-1">{date.month}</span>
                            <p className="text-blue-muted text-xs mt-0.5">{date.weekday}</p>
                        </div>
                        <span className="text-blue-muted text-sm">
                            {eventCount === 0
                                ? 'No events'
                                : `${eventCount} event${eventCount > 1 ? 's' : ''}`}
                        </span>
                    </div>

                    <TodoList />
                    <div className="h-6" />
                    <HabitList />
                </>
            ) : (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <CalendarView />
                </div>
            )}
        </div>
    )
}
