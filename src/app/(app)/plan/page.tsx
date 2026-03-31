'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
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
    const router = useRouter()
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState<TabView>('today')
    const [userName, setUserName] = useState<string>('User')
    const [showSuccess, setShowSuccess] = useState(false)
    const { getTodayEventCount } = usePlan()
    const supabase = createClient()
    const date = getFormattedDate()
    const greeting = getGreeting()
    const eventCount = getTodayEventCount()

    useEffect(() => {
        if (searchParams.get('payment') === 'success' || searchParams.get('status') === 'success') {
            setShowSuccess(true)
            // Cleanup URL
            const timeout = setTimeout(() => {
                router.replace('/plan')
            }, 5000)
            return () => clearTimeout(timeout)
        }
    }, [searchParams, router])

    useEffect(() => {
        async function fetchUserName() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('full_name')
                    .eq('id', user.id)
                    .single()

                if (profile?.full_name) {
                    setUserName(profile.full_name.split(' ')[0]) // Just first name
                }
            }
        }
        fetchUserName()
    }, [supabase])


    return (
        <div className="px-5 py-4">
            {/* Success Message */}
            {showSuccess && (
                <div className="mb-6 bg-navy text-white p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-bold text-[15px]">Welcome to Pro!</p>
                        <p className="text-white/70 text-[12px]">Your subscription is now active. Enjoy!</p>
                    </div>
                    <button
                        onClick={() => setShowSuccess(false)}
                        className="ml-auto text-white/40 hover:text-white"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
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
                        <button
                            onClick={() => setActiveTab('calendar')}
                            className="text-blue-muted text-sm hover:text-navy hover:underline transition-colors"
                        >
                            {eventCount === 0
                                ? 'No events'
                                : `${eventCount} event${eventCount > 1 ? 's' : ''}`}
                        </button>
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
