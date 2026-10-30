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
import { Skeleton } from '@/components/desktop/ui/Skeleton'
import dynamic from 'next/dynamic'
import { StartingReportCard } from '@/components/onboarding/StartingReportCard'

const DesktopInsightsView = dynamic(
  () => import('@/components/desktop/insights/DesktopInsightsView'),
  {
    ssr: false,
    loading: () => (
      <div className="p-6">
        <Skeleton className="h-[calc(100vh-140px)] w-full rounded-[20px]" />
      </div>
    ),
  }
)

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

        // 3. Fetch focus totals using focus_daily_totals RPC (with fallback)
        const { startOfWeek, endOfWeek } = getStartAndEndOfWeek(today)
        const startOfWeekStr = localDateStr(startOfWeek)
        const endOfWeekStr = localDateStr(endOfWeek)

        const lastWeekStart = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000)
        const lastWeekStartStr = localDateStr(lastWeekStart)
        const lastWeekEndStr = startOfWeekStr

        let allDailyTotals: Array<{ day: string; minutes: number }> = []

        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
            const { data: rpcData, error: rpcErr } = await supabase.rpc('focus_daily_totals', {
                p_from: lastWeekStartStr,
                p_to: endOfWeekStr,
                p_tz: tz,
            })
            if (!rpcErr && Array.isArray(rpcData)) {
                allDailyTotals = rpcData.map((r: any) => ({
                    day: String(r.day).slice(0, 10),
                    minutes: Number(r.minutes) || 0,
                }))
            } else {
                throw rpcErr || new Error('RPC returned no data')
            }
        } catch {
            // Fallback to daily_focus_activity if RPC is not yet executed
            const { data: allActivities } = await supabase
                .from('daily_focus_activity')
                .select('date, focus_time_minutes, focus_minutes')
                .eq('user_id', userId)
                .gte('date', lastWeekStartStr)
                .lte('date', endOfWeekStr)
            allDailyTotals = (allActivities || []).map((a: any) => ({
                day: a.date,
                minutes: a.focus_time_minutes ?? a.focus_minutes ?? 0,
            }))
        }

        // Calculate focus time within window
        const totalMin = allDailyTotals.reduce((acc, a) => acc + (a.minutes || 0), 0)
        setTotalFocusMinutes(totalMin)

        // current week vs previous week
        const currentFocusMinutes = allDailyTotals
            .filter((a) => a.day >= startOfWeekStr && a.day <= endOfWeekStr)
            .reduce((acc, curr) => acc + (curr.minutes || 0), 0)
        const prevFocusMinutes = allDailyTotals
            .filter((a) => a.day >= lastWeekStartStr && a.day < lastWeekEndStr)
            .reduce((acc, curr) => acc + (curr.minutes || 0), 0)

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
        return (
            <>
                <DesktopInsightsView />
                <StartingReportCard className="mx-auto -mt-10 mb-16 max-w-[1280px]" />
            </>
        )
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

            <StartingReportCard />
        </main>
    )
}
