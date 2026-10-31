import { useId, type ReactNode } from 'react'
import { cx } from './cx'

// Progress ring (spec 8.3, 10.3). Track in surface-strong, progress in a brand gradient with round caps.
// `glow` adds a soft blue glow to the arc in dark mode only.
export function Ring({
    size,
    stroke = 8,
    progress,
    gradient = 'primary',
    glow = false,
    label,
    children,
    className,
}: {
    size: number
    stroke?: number
    progress: number // 0..1
    gradient?: 'primary' | 'line'
    glow?: boolean
    label?: string
    children?: ReactNode
    className?: string
}) {
    const id = useId().replace(/:/g, '')
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0))
    const stops = gradient === 'line'
        ? [['0%', '#3781FC'], ['100%', '#CBE9FD']]
        : [['0%', '#1951FC'], ['100%', '#0B2CB1']]

    return (
        <div
            className={cx('relative inline-flex items-center justify-center shrink-0', className)}
            style={{ width: size, height: size }}
            role={label ? 'img' : undefined}
            aria-label={label}
        >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
                <defs>
                    <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
                        {stops.map(([o, col]) => <stop key={o} offset={o} stopColor={col} />)}
                    </linearGradient>
                </defs>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--m-surface-strong)" strokeWidth={stroke} />
                {p > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke={`url(#ring-${id})`}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={c}
                        strokeDashoffset={c * (1 - p)}
                        className={cx('transition-[stroke-dashoffset] duration-[450ms] ease-[var(--ease)]', glow && 'dark:drop-shadow-[0_0_8px_rgba(55,129,252,0.75)]')}
                    />
                )}
            </svg>
            <div className="relative flex flex-col items-center justify-center">{children}</div>
        </div>
    )
}
