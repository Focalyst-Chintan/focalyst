import type { ReactNode } from 'react'
import { cx } from './cx'

export interface SegmentOption<T extends string> {
    value: T
    label: ReactNode
    disabled?: boolean
    ariaLabel?: string
}

// Segmented control (spec 7.6). The blue thumb slides under the selected segment.
// onSelect receives the screen's existing handler; this component holds no state.
export function SegmentedControl<T extends string>({
    options,
    value,
    onSelect,
    className,
    label,
}: {
    options: SegmentOption<T>[]
    value: T
    onSelect: (value: T) => void
    className?: string
    label?: string
}) {
    const index = Math.max(0, options.findIndex((o) => o.value === value))
    return (
        <div role="tablist" aria-label={label} className={cx('m-seg', className)}>
            <span
                aria-hidden
                className="m-seg-thumb"
                style={{ width: `calc((100% - 6px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
            />
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="tab"
                    aria-selected={o.value === value}
                    aria-label={o.ariaLabel}
                    disabled={o.disabled}
                    onClick={() => onSelect(o.value)}
                    className="m-seg-btn inline-flex items-center justify-center gap-1"
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}
