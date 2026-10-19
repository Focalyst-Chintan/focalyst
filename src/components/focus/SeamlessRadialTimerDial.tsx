'use client'

import React from 'react'

interface SeamlessRadialTimerDialProps {
    progress: number // 0 to 1
    size?: number
    children?: React.ReactNode
    className?: string
}

export function SeamlessRadialTimerDial({
    progress,
    size = 280,
    children,
    className = '',
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
                    <radialGradient id="ambientHalo" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#2B6BFF" stopOpacity="0.08" />
                        <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.04" />
                        <stop offset="100%" stopColor="#2B6BFF" stopOpacity="0" />
                    </radialGradient>

                    {/* Feathered Blue Radial Wedge Gradient */}
                    <radialGradient id="focalystBlueWedge" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#2B6BFF" stopOpacity="0.58" />
                        <stop offset="38%" stopColor="#3B82F6" stopOpacity="0.40" />
                        <stop offset="72%" stopColor="#60A5FA" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#2B6BFF" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Ambient full circle halo */}
                <circle cx={cx} cy={cy} r={r} fill="url(#ambientHalo)" />

                {/* Clockwise feathered wedge */}
                {clampedProgress >= 0.999 ? (
                    <circle cx={cx} cy={cy} r={r} fill="url(#focalystBlueWedge)" />
                ) : piePath ? (
                    <path d={piePath} fill="url(#focalystBlueWedge)" />
                ) : null}
            </svg>

            {/* Overlaid children (countdown digits) extending beyond container so desk-clock numbers never clip */}
            <div className="absolute inset-y-0 -left-36 -right-36 flex items-center justify-center pointer-events-none z-10">
                {children}
            </div>
        </div>
    )
}
