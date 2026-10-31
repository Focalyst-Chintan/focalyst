import type { HTMLAttributes } from 'react'
import { cx } from './cx'

// Glass card (spec 5.1): translucent fill, hairline border, top highlight. No blur.
export function GlassCard({ className, size = 'lg', ...rest }: HTMLAttributes<HTMLDivElement> & { size?: 'lg' | 'md' }) {
    return <div className={cx('m-glass', size === 'md' && 'm-glass-md', className)} {...rest} />
}

// Hero glow card (spec 5.3): glass, blue tint from the top, glow along the bottom edge.
export function HeroCard({ className, grid = false, children, ...rest }: HTMLAttributes<HTMLDivElement> & { grid?: boolean }) {
    return (
        <div className={cx('m-hero', className)} {...rest}>
            {grid && <div aria-hidden className="m-hero-grid" />}
            <div className="relative">{children}</div>
        </div>
    )
}
