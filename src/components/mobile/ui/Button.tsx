import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

// Buttons (spec 7.3). Height 52, pill. Loading keeps the width and swaps the label for a spinner.
export function MButton({
    variant = 'primary',
    size = 'md',
    block = false,
    loading = false,
    icon,
    className,
    children,
    type = 'button',
    ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant
    size?: 'md' | 'sm'
    block?: boolean
    loading?: boolean
    icon?: ReactNode
}) {
    return (
        <button
            type={type}
            className={cx('m-btn m-press', `m-btn-${variant}`, size === 'sm' && 'm-btn-sm', block && 'm-btn-block', 'relative', className)}
            aria-busy={loading || undefined}
            {...rest}
        >
            <span className={cx('inline-flex items-center gap-2', loading && 'invisible')}>
                {icon}
                {children}
            </span>
            {loading && (
                <span aria-hidden className="absolute inset-0 flex items-center justify-center">
                    <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                </span>
            )}
        </button>
    )
}

// Round 44px icon button (spec 7.3). Always needs an aria-label.
export function MIconButton({
    plain = false,
    className,
    type = 'button',
    ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { plain?: boolean; 'aria-label': string }) {
    return <button type={type} className={cx('m-icon-btn m-press', plain && 'm-icon-btn-plain', className)} {...rest} />
}
