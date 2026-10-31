'use client'

import { useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cx } from './cx'

// Stepper (spec 7.5). The value stays a plain text field, so typing a number still works.
// onChange is the screen's existing setter; the buttons call it with the next value as a string.
// Long press repeats every 120ms after 400ms.
export function Stepper({
    label,
    value,
    unit,
    onChange,
    min = 1,
    max = 999,
    step = 1,
    disabled = false,
    onDisabledPress,
    trailing,
}: {
    label: string
    value: string
    unit?: string
    onChange: (next: string) => void
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    onDisabledPress?: () => void
    trailing?: React.ReactNode
}) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const repeat = useRef<ReturnType<typeof setInterval> | null>(null)
    const latest = useRef(value)

    const stop = () => {
        if (timer.current) clearTimeout(timer.current)
        if (repeat.current) clearInterval(repeat.current)
        timer.current = null
        repeat.current = null
    }

    const bump = (dir: 1 | -1) => {
        const current = Number(latest.current)
        const base = Number.isFinite(current) ? current : min
        const next = Math.min(max, Math.max(min, base + dir * step))
        latest.current = String(next)
        onChange(String(next))
    }

    const start = (dir: 1 | -1) => {
        if (disabled) {
            onDisabledPress?.()
            return
        }
        stop()
        latest.current = value
        bump(dir)
        timer.current = setTimeout(() => {
            repeat.current = setInterval(() => bump(dir), 120)
        }, 400)
    }

    // Stops a running repeat if the stepper leaves the screen mid-press (React 19 ref cleanup).
    // Created once so it doesn't fire on every re-render.
    const [cleanupRef] = useState(() => () => () => {
        if (timer.current) clearTimeout(timer.current)
        if (repeat.current) clearInterval(repeat.current)
    })

    const n = Number(value)
    const atMin = Number.isFinite(n) && n <= min
    const atMax = Number.isFinite(n) && n >= max

    const btn = (dir: 1 | -1) => (
        <button
            type="button"
            aria-label={`${dir === 1 ? 'Increase' : 'Decrease'} ${label.toLowerCase()}`}
            onPointerDown={(e) => {
                e.preventDefault()
                start(dir)
            }}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (disabled) onDisabledPress?.()
                    else {
                        latest.current = value
                        bump(dir)
                    }
                }
            }}
            aria-disabled={disabled || (dir === 1 ? atMax : atMin) || undefined}
            className={cx('m-icon-btn m-press', (disabled || (dir === 1 ? atMax : atMin)) && 'opacity-40')}
        >
            {dir === 1 ? <Plus size={18} strokeWidth={1.75} /> : <Minus size={18} strokeWidth={1.75} />}
        </button>
    )

    return (
        <div ref={cleanupRef} className="flex items-center justify-between gap-3 min-h-[60px]">
            <div className="min-w-0">
                <div className="m-footnote text-ink-2 flex items-center gap-1.5">
                    {label}
                    {trailing}
                </div>
                <label className="flex items-baseline gap-1 mt-0.5">
                    <span className="sr-only">{label}</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        size={Math.max(1, value.length)}
                        className="m-stat-m bg-transparent outline-none text-ink p-0 border-0 disabled:opacity-60"
                    />
                    {unit && <span className="m-subhead text-ink-2">{unit}</span>}
                </label>
            </div>
            <div className="flex items-center gap-2">
                {btn(-1)}
                {btn(1)}
            </div>
        </div>
    )
}
