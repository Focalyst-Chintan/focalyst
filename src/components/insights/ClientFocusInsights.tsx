'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { ReactNode } from 'react'
import { DeltaChip, HeroCard } from '@/components/mobile/ui'
import { AnimatedNumber, shouldDrawIn } from '@/components/mobile/insights/AnimatedNumber'
import { TrendChart } from '@/components/mobile/charts/TrendChart'
import { hm, hmSpoken, hmText } from '@/components/mobile/charts/format'
import { useReducedMotion } from '@/components/mobile/hooks'
import { useTranslation } from 'react-i18next'
import { ProductivityScoreCard } from '@/components/insights/ProductivityScoreCard'
import { getStartAndEndOfWeek, calculateTrend } from '@/lib/utils/insights'
import { localDateStr } from '@/lib/utils/date'
import dynamic from 'next/dynamic'

const FocusActivityCard = dynamic(() => import('@/components/insights/FocusActivityCard').then(mod => mod.FocusActivityCard), {
    loading: () => <div className="m-skel h-[300px] w-full !rounded-[24px]" />,
    ssr: false
})

// Same cards as before, in the same order: focus time (now the hero with its trend), productivity
// score, focus activity. `children` (the this-week strip) sits right under the focus time card.
export function ClientFocusInsights({ isPaid, productivityScore, children }: { isPaid: boolean, productivityScore: number, children?: ReactNode }) {
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

    // Display only: the chart reads minutes; best day is marked by the chart itself.
    const reduced = useReducedMotion()
    const { t } = useTranslation()
    type Day = { day: string; focus: number; break: number; date?: Date }
    const trend7 = (dailyData as Day[]).map((d) => ({
        label: d.day,
        value: Math.round((d.focus || 0) * 60),
        name: d.date ? new Date(d.date).toLocaleDateString('en-GB', { weekday: 'long' }) : d.day,
    }))
    const best = trend7.reduce<(typeof trend7)[number] | null>((b, d) => (d.value > (b?.value ?? 0) ? d : b), null)
    const drawIn = shouldDrawIn('focus:week', totalMinutes, reduced)

    return (
        <div className="space-y-3">
            <HeroCard className="pt-5 pb-3">
                <div className="px-5">
                    <p className="m-overline text-ink-2">{t('insights.totalFocus')}</p>
                    <p className="m-stat-xl text-ink mt-1.5 whitespace-nowrap">
                        <AnimatedNumber
                            metric="focus:week"
                            value={totalMinutes}
                            label={hmSpoken(totalMinutes)}
                            render={(n) => {
                                const { h, m } = hm(n)
                                return (
                                    <>
                                        {h}<span className="m-unit">h</span>{' '}{m}<span className="m-unit">m</span>
                                    </>
                                )
                            }}
                        />
                    </p>
                    {trend !== 0 && <DeltaChip className="mt-2" value={trend} comparedTo="vs last week" />}
                </div>
                <div
                    className="mt-2 px-1"
                    role="img"
                    aria-label={best && best.value > 0 ? `Focus by day, last 7 days. Best day ${best.name}, ${hmSpoken(best.value)}` : 'No focus yet this week'}
                >
                    <TrendChart data={trend7} format={hmText} drawIn={drawIn} emptyText="No focus yet this week" />
                </div>
            </HeroCard>
            {children}
            <ProductivityScoreCard score={productivityScore} isPaid={isPaid} />
            <FocusActivityCard data={dailyData} isPaid={isPaid} />
        </div>
    )
}
