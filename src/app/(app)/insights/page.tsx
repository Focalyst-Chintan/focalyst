'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { TasksCompletedCard } from '@/components/insights/TasksCompletedCard'
import { ClientFocusInsights } from '@/components/insights/ClientFocusInsights'
import { CurrentStreaksList } from '@/components/insights/CurrentStreaksList'
import { AISummaryCard } from '@/components/insights/AISummaryCard'
import { InsightsLevelWrapper } from '@/components/insights/InsightsLevelWrapper'
import { getStartAndEndOfWeek, calculateProductivityScore } from '@/lib/utils/insights'
import { localDateStr } from '@/lib/utils/date'
import WeeklyReportView from '@/components/insights/WeeklyReportView'
import InsightsHeader from '@/components/insights/InsightsHeader'
import HabitGroupLeaderboardSection from '@/components/insights/HabitGroupLeaderboardSection'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import DesktopInsightsView from '@/components/desktop/insights/DesktopInsightsView'
import { Skeleton } from '@/components/desktop/ui/Skeleton'

export default function InsightsPage() {
    const isDesktop = useIsDesktop()
    const supabase = createClient()
    const { user } = useAuth()

    const [loading, setLoading] = useState(true)
    const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free')
    const [isPaid, setIsPaid] = useState(false)
    const [completedTasks, setCompletedTasks] = useState(0)
    const [totalTasks, setTotalTasks] = useState(0)
    const [totalFocusMinutes, setTotalFocusMinutes] = useState(0)
    const [productivityScore, setProductivityScore] = useState(0)
    const [habitsData, setHabitsData] = useState<any[]>([])
    const [formattedDate, setFormattedDate] = useState('')

    const [totalXP, setTotalXP] = useState(0)

    const fetchInsights = useCallback(async () => {
        if (!user) return
        const userId = user.id
        const today = new Date()
        setFormattedDate(today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))

        // 1. Fetch User Plan & XP
        const { data: userData } = await supabase
            .from('users')
            .select('plan, total_xp')
            .eq('id', userId)
            .single()

        const paid = userData?.plan !== 'free'
        setIsPaid(paid)
        setUserPlan(paid ? 'pro' : 'free')
        setTotalXP(userData?.total_xp || 0)

        // 2. Fetch Tasks (Pending + Completed Today)
        const { data: pendingData } = await supabase
            .from('tasks')
            .select('id')
            .eq('user_id', userId)
            .eq('is_completed', false)

        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString()

        const { data: completedTodayData } = await supabase
            .from('tasks')
            .select('id')
            .eq('user_id', userId)
            .eq('is_completed', true)
            .gte('completed_at', startOfToday)
            .lte('completed_at', endOfToday)

        const pendingCount = pendingData?.length || 0
        const completed = completedTodayData?.length || 0
        const total = pendingCount + completed
        setCompletedTasks(completed)
        setTotalTasks(total)

        // 3. Fetch daily_focus_activity data using localDateStr to eliminate timezone drift
        const { startOfWeek, endOfWeek } = getStartAndEndOfWeek(today)
        const startOfWeekStr = localDateStr(startOfWeek)
        const endOfWeekStr = localDateStr(endOfWeek)

        const lastWeekStart = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000)
        const lastWeekStartStr = localDateStr(lastWeekStart)
        const lastWeekEndStr = startOfWeekStr

        // Fetch records bounded by the active period
        const { data: allActivities } = await supabase
            .from('daily_focus_activity')
            .select('*')
            .eq('user_id', userId)
            .gte('date', lastWeekStartStr)
            .lte('date', endOfWeekStr)

        // Calculate focus time within window
        const totalMin = allActivities?.reduce((acc: number, a: any) => acc + (a.focus_time_minutes || 0), 0) || 0
        setTotalFocusMinutes(totalMin)

        // current week
        const currentWeekActivities = allActivities?.filter((a: any) => a.date >= startOfWeekStr && a.date <= endOfWeekStr) || []
        const previousWeekActivities = allActivities?.filter((a: any) => a.date >= lastWeekStartStr && a.date < lastWeekEndStr) || []

        const currentFocusMinutes = currentWeekActivities.reduce((acc: number, curr: any) => acc + (curr.focus_time_minutes || 0), 0)
        const prevFocusMinutes = previousWeekActivities.reduce((acc: number, curr: any) => acc + (curr.focus_time_minutes || 0), 0)

        // 4. Fetch Active Habits (Streaks)
        const { data: habits } = await supabase
            .from('habits')
            .select('id, name, icon, current_streak, color')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('position')

        setHabitsData(habits || [])

        const activeHabitsCount = habits?.length || 0
        const totalStreaksSum = habits?.reduce((acc: number, habit: any) => acc + habit.current_streak, 0) || 0

        // 5. Calculate Productivity Score
        const score = calculateProductivityScore(
            completed,
            total,
            totalStreaksSum,
            activeHabitsCount,
            currentFocusMinutes,
            prevFocusMinutes
        )
        setProductivityScore(score)
        setLoading(false)
    }, [supabase, user])

    useEffect(() => {
        fetchInsights()

        const handleFocusUpdated = () => fetchInsights()
        const handleHabitUpdated = () => fetchInsights()

        window.addEventListener('focalyst:focus-updated', handleFocusUpdated)
        window.addEventListener('focalyst:habit-updated', handleHabitUpdated)

        return () => {
            window.removeEventListener('focalyst:focus-updated', handleFocusUpdated)
            window.removeEventListener('focalyst:habit-updated', handleHabitUpdated)
        }
    }, [fetchInsights])

    if (isDesktop === null) {
        return (
            <div className="p-6">
                <Skeleton className="h-[calc(100vh-140px)] w-full rounded-[20px]" />
            </div>
        )
    }

    if (isDesktop) {
        return <DesktopInsightsView />
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-page-bg dark:bg-[#0B1021]">
                <div className="w-8 h-8 rounded-full border-2 border-[#2B6BFF] border-t-transparent animate-spin" />
            </div>
        )
    }

    return (
        <main className="flex-1 p-4 md:p-8 w-full max-w-[800px] mx-auto overflow-x-hidden space-y-5">
            <InsightsHeader formattedDate={formattedDate} />

            <InsightsLevelWrapper totalXP={totalXP} />

            <div className="space-y-4">
                <TasksCompletedCard completed={completedTasks} total={totalTasks} />
                <ClientFocusInsights isPaid={isPaid} productivityScore={productivityScore} />
            </div>

            <CurrentStreaksList habits={habitsData} />

            {/* Habit Group Leaderboard Section */}
            <HabitGroupLeaderboardSection
                activeHabits={habitsData}
                userId={user?.id}
                onRefreshInsights={fetchInsights}
            />

            {isPaid && <AISummaryCard />}

            {/* Weekly Productivity Report — fetches data client-side from the API */}
            <WeeklyReportView userPlan={userPlan} />
        </main>
    )
}
