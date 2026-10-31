'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from '@/components/mobile/hooks'
import { countUpStart, markSeen } from './lastSeen'

const DURATION = 200 // spec 9.4

// cubic-bezier(0.2, 0.8, 0.2, 1) is close to an ease-out cubic
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

// Count-up for Insights numbers (spec 9.4). Plays once per change, never on a plain revisit,
// never under reduced motion. Every frame is rendered in the final format by `render`.
// Screen readers get the final value from the start.
export function AnimatedNumber({
    metric,
    value,
    render,
    label,
}: {
    metric: string
    value: number
    render: (n: number) => ReactNode
    label: string
}) {
    const reduced = useReducedMotion()
    // The number currently drawn while a count-up runs; null means "show the value".
    const [anim, setAnim] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null
        return countUpStart(metric, value)
    })
    const frame = useRef<number | null>(null)

    useEffect(() => {
        const start = reduced ? null : countUpStart(metric, value)
        if (start === null) {
            markSeen(metric, value)
            frame.current = requestAnimationFrame(() => setAnim(null))
            return () => {
                if (frame.current !== null) cancelAnimationFrame(frame.current)
            }
        }
        const t0 = performance.now()
        const step = (now: number) => {
            const t = Math.min(1, (now - t0) / DURATION)
            if (t < 1) {
                setAnim(Math.round(start + (value - start) * easeOut(t)))
                frame.current = requestAnimationFrame(step)
            } else {
                setAnim(null)
                markSeen(metric, value)
            }
        }
        frame.current = requestAnimationFrame(step)
        return () => {
            if (frame.current !== null) cancelAnimationFrame(frame.current)
        }
    }, [metric, value, reduced])

    const shown = anim ?? value

    return (
        <>
            <span className="sr-only">{label}</span>
            <span aria-hidden>{render(shown)}</span>
        </>
    )
}

// Whether a chart for this metric should draw in (spec 8.5): same once-only rule.
export function shouldDrawIn(metric: string, value: number, reduced: boolean): boolean {
    if (reduced || typeof window === 'undefined') return false
    return countUpStart(metric, value) !== null
}
