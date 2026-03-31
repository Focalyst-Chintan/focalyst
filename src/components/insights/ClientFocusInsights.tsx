'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { FocusTimeCard } from '@/components/insights/FocusTimeCard'
import { ProductivityScoreCard } from '@/components/insights/ProductivityScoreCard'
import { getStartAndEndOfWeek, calculateTrend } from '@/lib/utils/insights'
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

    useEffect(() => {
        const fetchFocusData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('daily_focus_activity')
                .select('date, focus_time_minutes, break_time_minutes')
                .eq('user_id', user.id)

            if (error) {
                console.error("Error fetching focus data:", error)
                return
            }

            console.log('Fetched from Supabase:', data)

            // Total focus minutes across all items
            const total = data.reduce((acc, curr) => acc + (curr.focus_time_minutes || 0), 0)
            setTotalMinutes(total)

            // Generate last 7 calendar days
            const last7Days: any[] = []
            for (let i = 6; i >= 0; i--) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                const dateStr = d.toISOString().split('T')[0]
                const dayRecord = data.find((r: any) => r.date === dateStr)
                last7Days.push({
                    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                    focus: dayRecord ? +(dayRecord.focus_time_minutes / 60).toFixed(2) : 0,
                    break: dayRecord ? +(dayRecord.break_time_minutes / 60).toFixed(2) : 0,
                    date: d
                })
            }
            setDailyData(last7Days)

            // Setup trend comparing to prev week
            const today = new Date()
            const { startOfWeek, endOfWeek } = getStartAndEndOfWeek(today)
            const currentWeekActs = data.filter((a: any) => a.date >= startOfWeek.toISOString().split('T')[0] && a.date <= endOfWeek.toISOString().split('T')[0])

            const lastWeekStart = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000)
            const lastWeekEnd = new Date(startOfWeek.getTime() - 1)
            const prevWeekActs = data.filter((a: any) => a.date >= lastWeekStart.toISOString().split('T')[0] && a.date <= lastWeekEnd.toISOString().split('T')[0])

            const currentMins = currentWeekActs.reduce((acc, curr) => acc + (curr.focus_time_minutes || 0), 0)
            const prevMins = prevWeekActs.reduce((acc, curr) => acc + (curr.focus_time_minutes || 0), 0)
            setTrend(calculateTrend(currentMins, prevMins))
        }

        fetchFocusData()

        const handleFocus = () => fetchFocusData()
        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [])

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
