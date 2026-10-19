'use client'

import React from 'react'

export interface GradientStop {
    offset: string
    color: string
    opacity?: number
}

interface SeamlessRadialTimerDialProps {
    progress: number // 0 to 1
    size?: number
    children?: React.ReactNode
    className?: string
    gradientStops?: GradientStop[]
    trackColor?: string
    idPrefix?: string
}

const DEFAULT_HALO_STOPS: GradientStop[] = [
    { offset: '0%', color: '#2B6BFF', opacity: 0.08 },
    { offset: '60%', color: '#3B82F6', opacity: 0.04 },
    { offset: '100%', color: '#2B6BFF', opacity: 0 },
]

const DEFAULT_WEDGE_STOPS: GradientStop[] = [
    { offset: '0%', color: '#2B6BFF', opacity: 0.58 },
    { offset: '38%', color: '#3B82F6', opacity: 0.40 },
    { offset: '72%', color: '#60A5FA', opacity: 0.15 },
    { offset: '100%', color: '#2B6BFF', opacity: 0 },
]

export function SeamlessRadialTimerDial({
    progress,
    size = 280,
    children,
    className = '',
    gradientStops,
    trackColor,
    idPrefix = 'dial',
}: SeamlessRadialTimerDialProps) {
    const clampedProgress = Math.max(0, Math.min(1, progress))
    const cx = size / 2
    const cy = size / 2
    const r = size / 2

    // Pie-slice calculation starting at 12 o'clock (-90 deg)
    const endAngle = -Math.PI / 2 + clampedProgress * 2 * Math.PI
    const x0 = cx
    const y0 = cy - r
    const x1 = cx + r * Math.cos(endAngle)
    const y1 = cy + r * Math.sin(endAngle)
    const largeArcFlag = clampedProgress > 0.5 ? 1 : 0

    const piePath = clampedProgress > 0.001 && clampedProgress < 0.999
        ? `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArcFlag} 1 ${x1} ${y1} Z`
        : null

    const wedgeStops = gradientStops || DEFAULT_WEDGE_STOPS
    const haloId = `${idPrefix}-ambientHalo`
    const wedgeId = `${idPrefix}-focalystBlueWedge`

    return (
        <div
            className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
            style={{ width: size, height: size }}
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="overflow-visible pointer-events-none"
            >
                <defs>
                    {/* Ambient Center Glow */}
                    <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
                        {DEFAULT_HALO_STOPS.map((s, idx) => (
                            <stop
                                key={idx}
                                offset={s.offset}
                                stopColor={s.color}
                                stopOpacity={s.opacity ?? 1}
                            />
                        ))}
                    </radialGradient>

                    {/* Feathered Radial Wedge Gradient */}
                    <radialGradient id={wedgeId} cx="50%" cy="50%" r="50%">
                        {wedgeStops.map((s, idx) => (
                            <stop
                                key={idx}
                                offset={s.offset}
                                stopColor={s.color}
                                stopOpacity={s.opacity ?? 1}
                            />
                        ))}
                    </radialGradient>
                </defs>

                {/* Optional track ring line behind halo */}
                {trackColor && (
                    <circle
                        cx={cx}
                        cy={cy}
                        r={r - 1}
                        fill="none"
                        stroke={trackColor}
                        strokeWidth="1.5"
                    />
                )}

                {/* Ambient full circle halo */}
                <circle cx={cx} cy={cy} r={r} fill={`url(#${haloId})`} />

                {/* Clockwise feathered wedge */}
                {clampedProgress >= 0.999 ? (
                    <circle cx={cx} cy={cy} r={r} fill={`url(#${wedgeId})`} />
                ) : piePath ? (
                    <path d={piePath} fill={`url(#${wedgeId})`} />
                ) : null}
            </svg>

            {/* Overlaid children (countdown digits) extending beyond container so desk-clock numbers never clip */}
            <div className="absolute inset-y-0 -left-36 -right-36 flex items-center justify-center pointer-events-none z-10">
                {children}
            </div>
        </div>
    )
}
