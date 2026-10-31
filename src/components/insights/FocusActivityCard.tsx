'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { Lock } from 'lucide-react'
import { hmText } from '@/components/mobile/charts/format'
import { useReducedMotion } from '@/components/mobile/hooks'

interface DailyData {
    day: string;
    focus: number;
    break: number;
    date: Date;
}

export function FocusActivityCard({ data, isPaid }: { data: DailyData[], isPaid: boolean }) {
    const { t } = useTranslation()
    const [view, setView] = useState<'weekly' | 'monthly'>('weekly')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // UI only: the tapped bar; defaults to the last day (today)
    const [selected, setSelected] = useState<number | null>(null)
    const reduced = useReducedMotion()
    const sel = selected ?? data.length - 1
    const selDay = data[sel]

    // Display only: stacked segment shapes. The top segment gets rounded corners;
    // a day with nothing gets a 6px stub instead of an empty capsule (spec 8.2).
    const segment = (kind: 'focus' | 'break') => function Segment(props: unknown) {
        const { x, y, width, height, payload, index } = props as { x: number; y: number; width: number; height: number; payload: DailyData; index: number }
        const isSel = index === sel
        const total = (payload.focus || 0) + (payload.break || 0)
        if (kind === 'focus' && total === 0) {
            return <rect x={x} y={y - 6} width={width} height={6} rx={3} fill="var(--m-surface-strong)" />
        }
        if (!height || height <= 0) return <g />
        const top = kind === 'break' || !payload.break
        const r = top ? Math.min(8, width / 2, height) : 0
        const d = `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`
        const fill = kind === 'break' ? 'var(--m-chart-break)' : isSel ? 'url(#fx-bar-sel)' : '#3781FC'
        return (
            <path
                d={d}
                fill={fill}
                opacity={isSel ? 1 : 0.55}
                className={isSel && kind === 'focus' ? 'dark:drop-shadow-[0_0_10px_rgba(55,129,252,0.6)]' : undefined}
            />
        )
    }

    const totalMins = selDay ? Math.round(((selDay.focus || 0) + (selDay.break || 0)) * 60) : 0
    const focusMins = selDay ? Math.round((selDay.focus || 0) * 60) : 0

    return (
        <div className="m-glass p-5 w-full">
            <div className="flex justify-between items-center gap-3 mb-1">
                <h3 className="m-title-3 text-ink">{t('insights.activity')}</h3>
                <div className="m-seg !h-9" role="tablist" aria-label="Period">
                    <span aria-hidden className="m-seg-thumb" style={{ width: 'calc((100% - 6px) / 2)', transform: `translateX(${view === 'monthly' ? 100 : 0}%)` }} />
                    <button
                        role="tab"
                        aria-selected={view === 'weekly'}
                        onClick={() => setView('weekly')}
                        className="m-seg-btn !text-[13px] !px-3"
                    >
                        {t('insights.weekly')}
                    </button>
                    <button
                        role="tab"
                        aria-selected={view === 'monthly'}
                        aria-disabled={!isPaid}
                        onClick={() => {
                            if (isPaid) setView('monthly')
                        }}
                        className={`m-seg-btn !text-[13px] !px-3 inline-flex items-center gap-1 ${!isPaid ? 'opacity-60' : ''}`}
                    >
                        {t('insights.monthly')}
                        {!isPaid && <Lock size={12} strokeWidth={2} aria-hidden />}
                    </button>
                </div>
            </div>

            {/* Value of the selected day (tap a bar to change it) */}
            <p className="m-footnote text-ink-2 min-h-[18px]" aria-live="polite">
                {selDay ? (
                    <>
                        <span className="m-subhead !font-semibold text-ink m-num">{hmText(focusMins)}</span>
                        {' '}focus on {selDay.date ? new Date(selDay.date).toLocaleDateString('en-GB', { weekday: 'long' }) : selDay.day}
                        {totalMins > focusMins && <span className="m-num">, {hmText(totalMins - focusMins)} break</span>}
                    </>
                ) : null}
            </p>

            <div
                className="h-44 w-full mt-3 text-ink-2 select-none [-webkit-tap-highlight-color:transparent]"
                role="img"
                aria-label={`Focus and break by day: ${data.map((d) => `${d.day} ${hmText(Math.round((d.focus || 0) * 60))}`).join(', ')}`}
            >
                {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barSize={28}>
                            <defs>
                                <linearGradient id="fx-bar-sel" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3781FC" />
                                    <stop offset="100%" stopColor="#1951FC" />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                                dy={8}
                            />
                            <YAxis hide domain={[0, (max: number) => Math.max(max, 0.1)]} />
                            <Bar
                                dataKey="focus"
                                stackId="a"
                                shape={segment('focus')}
                                onClick={(_, index) => setSelected(index)}
                                isAnimationActive={!reduced}
                                animationDuration={350}
                                animationEasing="ease-out"
                            />
                            <Bar
                                dataKey="break"
                                stackId="a"
                                shape={segment('break')}
                                onClick={(_, index) => setSelected(index)}
                                isAnimationActive={!reduced}
                                animationDuration={350}
                                animationEasing="ease-out"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="flex items-center gap-5 mt-4">
                <div className="flex items-center gap-2">
                    <span aria-hidden className="w-2 h-2 rounded-full bg-[#3781FC]"></span>
                    <span className="m-caption text-ink-2">{t('nav.focus')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span aria-hidden className="w-2 h-2 rounded-full bg-[var(--m-chart-break)]"></span>
                    <span className="m-caption text-ink-2">{t('focus.break')}</span>
                </div>
            </div>
        </div>
    )
}
