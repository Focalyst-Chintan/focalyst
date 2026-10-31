import type { MouseEvent } from 'react'
import { cx } from './cx'

// Switch (spec 7.8): 51×31, blue track when on.
export function MSwitch({
    checked,
    onClick,
    label,
    disabled,
    className,
}: {
    checked: boolean
    onClick: (e: MouseEvent<HTMLButtonElement>) => void
    label: string
    disabled?: boolean
    className?: string
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={cx('m-switch', className)}
        />
    )
}

// Round checkbox (spec 7.8): 24 for tasks, 32 for habits. Checked = blue gradient + white check.
export function MCheckbox({
    checked,
    onClick,
    label,
    size = 'md',
    className,
}: {
    checked: boolean
    onClick: (e: MouseEvent<HTMLButtonElement>) => void
    label: string
    size?: 'md' | 'lg'
    className?: string
}) {
    const s = size === 'lg' ? 16 : 13
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={label}
            onClick={onClick}
            className={cx('m-check', size === 'lg' && 'm-check-lg', className)}
        >
            <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M3 7.2L6 10L11 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    )
}
