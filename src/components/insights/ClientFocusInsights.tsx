'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { FocusTimeCard } from '@/components/insights/FocusTimeCard'
import { ProductivityScoreCard } from '@/components/insights/ProductivityScoreCard'
import { getStartAndEndOfWeek, calculateTrend } from '@/lib/utils/insights'
import { localDateStr } from '@/lib/utils/date'
import dynamic from 'next/dynamic'

const FocusActivityCard = dynamic(() => import('@/components/insights/FocusActivityCard').then(mod => mod.FocusActivityCard), {
    loading: () => <div className="h-48 w-full bg-card-bg/20 animate-pulse rounded-3xl" />,
    ssr: false
})

export function ClientFocusInsights({ isPaid, productivityScore }: { isPaid: boolean, productivityScore: number }) {
    const supabase = createClient()
    const [totalMinutes, setTotalMinutes] = useState<number>(0)
    const [dailyData, setDailyData] = useState<any[]>([])
    const [trend, setTrend] = useState<number>(0)

    const fetchFocusData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const today = new Date()
        const { startOfWeek, endOfWeek } = getStartAndEndOfWeek(today)
        const endOfWeekStr = localDateStr(endOfWeek)
        const lastWeekStart = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000)
        const lastWeekStartStr = localDateStr(lastWeekStart)

        const { data, error } = await supabase
            .from('daily_focus_activity')
            .select('date, focus_time_minutes, break_time_minutes')
            .eq('user_id', user.id)
            .gte('date', lastWeekStartStr)
            .lte('date', endOfWeekStr)

        if (error) {
            console.error("Error fetching focus data:", error)
            return
        }

        const activities = data || []

        // Total focus minutes across all items in current period
        const total = activities.reduce((acc: number, curr: any) => acc + (curr.focus_time_minutes || 0), 0)
        setTotalMinutes(total)

        // Generate last 7 calendar days with accurate local date string matching
        const last7Days: any[] = []
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = localDateStr(d)
            const dayRecord = activities.find((r: any) => r.date === dateStr)
            last7Days.push({
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                focus: dayRecord ? +(dayRecord.focus_time_minutes / 60).toFixed(2) : 0,
                break: dayRecord ? +(dayRecord.break_time_minutes / 60).toFixed(2) : 0,
                date: d
            })
        }
        setDailyData(last7Days)

        // Setup trend comparing to prev week using localDateStr
        const startOfWeekStr = localDateStr(startOfWeek)
        const currentWeekActs = activities.filter((a: any) => a.date >= startOfWeekStr && a.date <= endOfWeekStr)

        const lastWeekEnd = new Date(startOfWeek.getTime() - 1)
        const lastWeekEndStr = localDateStr(lastWeekEnd)
        const prevWeekActs = activities.filter((a: any) => a.date >= lastWeekStartStr && a.date <= lastWeekEndStr)

        const currentMins = currentWeekActs.reduce((acc: number, curr: any) => acc + (curr.focus_time_minutes || 0), 0)
        const prevMins = prevWeekActs.reduce((acc: number, curr: any) => acc + (curr.focus_time_minutes || 0), 0)
        setTrend(calculateTrend(currentMins, prevMins))
    }, [supabase])

    useEffect(() => {
        fetchFocusData()

        const handleFocus = () => fetchFocusData()
        const handleFocusUpdated = () => fetchFocusData()

        window.addEventListener('focus', handleFocus)
        window.addEventListener('focalyst:focus-updated', handleFocusUpdated)

        return () => {
            window.removeEventListener('focus', handleFocus)
            window.removeEventListener('focalyst:focus-updated', handleFocusUpdated)
        }
    }, [fetchFocusData])

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FocusTimeCard minutes={totalMinutes} trend={trend} />
                <ProductivityScoreCard score={productivityScore} isPaid={isPaid} />
            </div>
            <FocusActivityCard data={dailyData} isPaid={isPaid} />
        </div>
    )
}
