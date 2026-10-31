'use client'

import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Timer } from 'lucide-react'

export interface TrendPoint {
    label: string // x axis, e.g. "Mon"
    value: number // minutes
    name: string // tooltip day, e.g. "Monday"
}

// Head of the line: 10 white dot, 3 brand-400 ring, soft glow (spec 8.1).
function HeadDot({ cx, cy }: { cx?: number; cy?: number }) {
    if (cx == null || cy == null) return null
    return (
        <g>
            <circle cx={cx} cy={cy} r={12} fill="#3781FC" opacity={0.22} />
            <circle cx={cx} cy={cy} r={5} fill="#FFFFFF" stroke="#3781FC" strokeWidth={3} />
        </g>
    )
}

// Line and area chart (spec 8.1) on recharts, the library the desktop uses.
// Smooth monotone curve, grad-line stroke, grad-area fill, vertical grid only, no Y labels.
// The best day is always marked; touching the chart scrubs with a glass tooltip.
export function TrendChart({
    data,
    format,
    drawIn,
    emptyText,
    height = 150,
}: {
    data: TrendPoint[]
    format: (v: number) => string
    drawIn: boolean
    emptyText: string
    height?: number
}) {
    const id = useId().replace(/:/g, '')
    const allZero = data.length === 0 || data.every((d) => !d.value)

    if (allZero) {
        return (
            <div className="relative flex flex-col items-center justify-center gap-2" style={{ height }}>
                <div aria-hidden className="absolute left-0 right-0 bottom-8 border-t-[1.5px] border-dashed border-line-strong" />
                <Timer size={20} strokeWidth={1.75} className="text-ink-2" aria-hidden />
                <p className="m-footnote text-ink-2">{emptyText}</p>
            </div>
        )
    }

    let best = 0
    data.forEach((d, i) => {
        if (d.value > data[best].value) best = i
    })

    return (
        <div className="m-chart text-ink-2 select-none [-webkit-tap-highlight-color:transparent]" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 40, right: 14, left: 14, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`tl-${id}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3781FC" />
                            <stop offset="100%" stopColor="#CBE9FD" />
                        </linearGradient>
                        <linearGradient id={`ta-${id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(55,129,252,0.35)" />
                            <stop offset="100%" stopColor="rgba(55,129,252,0)" />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical horizontal={false} stroke="var(--m-chart-grid)" />
                    <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                        dy={6}
                        height={24}
                    />
                    <YAxis hide domain={[0, (max: number) => max * 1.1]} />
                    <Tooltip
                        cursor={false}
                        defaultIndex={best}
                        content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null
                            const p = payload[0].payload as TrendPoint
                            return (
                                <div className="m-blur border border-line rounded-[12px] px-3 py-1.5 text-center shadow-[var(--shadow-glass)] -translate-y-3">
                                    <span className="block m-subhead !font-semibold text-ink m-num">{format(p.value)}</span>
                                    <span className="block m-caption text-ink-2">{p.name}</span>
                                </div>
                            )
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={`url(#tl-${id})`}
                        strokeWidth={3}
                        strokeLinecap="round"
                        fill={`url(#ta-${id})`}
                        isAnimationActive={drawIn}
                        animationDuration={450}
                        animationEasing="ease-out"
                        dot={false}
                        activeDot={<HeadDot />}
                    />
                    <ReferenceDot x={data[best].label} y={data[best].value} shape={<HeadDot />} ifOverflow="visible" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
