import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

import { TasksCompletedCard } from '@/components/insights/TasksCompletedCard'
import { ClientFocusInsights } from '@/components/insights/ClientFocusInsights'
import { CurrentStreaksList } from '@/components/insights/CurrentStreaksList'
import { AISummaryCard } from '@/components/insights/AISummaryCard'
import { getStartAndEndOfWeek, calculateTrend, calculateProductivityScore } from '@/lib/utils/insights'

export default async function InsightsPage() {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD

    // 1. Fetch User Plan
    const { data: userData } = await supabase
        .from('users')
        .select('plan')
        .eq('id', user.id)
        .single()

    const isPaid = userData?.plan !== 'free'

    // 2. Fetch Tasks (Pending + Completed Today)
    const { data: pendingData } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_completed', false)

    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString()

    const { data: completedTodayData } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .gte('completed_at', startOfToday)
        .lte('completed_at', endOfToday)

    const pendingCount = pendingData?.length || 0
    const completedTasks = completedTodayData?.length || 0
    const totalTasks = pendingCount + completedTasks

    // 3. Fetch daily_focus_activity data
    const { startOfWeek, endOfWeek } = getStartAndEndOfWeek(today)

    // Fetch ALL records for the authenticated user
    const { data: allActivities } = await supabase
        .from('daily_focus_activity')
        .select('*')
        .eq('user_id', user.id)

    // Calculate total focus time across all recorded days (handled by client component now)

    // current week
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0]
    const endOfWeekStr = endOfWeek.toISOString().split('T')[0]

    const currentWeekActivities = allActivities?.filter(a => a.date >= startOfWeekStr && a.date <= endOfWeekStr) || []

    // previous week
    const lastWeekStart = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeekEnd = new Date(startOfWeek.getTime() - 1)
    const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0]
    const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0]

    const previousWeekActivities = allActivities?.filter(a => a.date >= lastWeekStartStr && a.date <= lastWeekEndStr) || []

    const currentFocusMinutes = currentWeekActivities.reduce((acc, curr) => acc + (curr.focus_time_minutes || 0), 0)
    const prevFocusMinutes = previousWeekActivities.reduce((acc, curr) => acc + (curr.focus_time_minutes || 0), 0)

    // 4. Fetch Active Habits (Streaks)
    const { data: habitsData } = await supabase
        .from('habits')
        .select('id, name, icon, current_streak')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('position')

    const activeHabitsCount = habitsData?.length || 0
    const totalStreaksSum = habitsData?.reduce((acc, habit) => acc + habit.current_streak, 0) || 0

    // 5. Calculate Productivity Score
    const productivityScore = calculateProductivityScore(
        completedTasks,
        totalTasks,
        totalStreaksSum,
        activeHabitsCount,
        currentFocusMinutes,
        prevFocusMinutes
    )

    const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) // e.g. Oct 24

    return (
        <main className="flex-1 p-4 md:p-8 w-full max-w-[800px] mx-auto overflow-x-hidden">
            <div className="flex justify-between items-end mb-6">
                <h1 className="text-[24px] font-bold text-navy">Insights</h1>
                <span className="text-[13px] text-blue-muted">Today, {formattedDate}</span>
            </div>

            <div className="space-y-4">
                <TasksCompletedCard completed={completedTasks} total={totalTasks} />

                <ClientFocusInsights isPaid={isPaid} productivityScore={productivityScore} />
            </div>

            <CurrentStreaksList habits={habitsData || []} />

            {isPaid && <AISummaryCard />}
        </main>
    )
}
