import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { cx } from './cx'

// Dashed add row (spec 7.10). Replaces the big full-width orange buttons.
export function AddRow({ label, onClick, icon, className }: { label: ReactNode; onClick: () => void; icon?: ReactNode; className?: string }) {
    return (
        <button type="button" onClick={onClick} className={cx('m-add-row m-press', className)}>
            {icon ?? <Plus size={18} strokeWidth={1.75} aria-hidden />}
            <span>{label}</span>
        </button>
    )
}

// Section header (spec 10.1): overline label, optional count, optional action on the right.
export function SectionHeader({ label, count, action, className, as: Tag = 'h2' }: { label: ReactNode; count?: number; action?: ReactNode; className?: string; as?: 'h2' | 'h3' }) {
    return (
        <div className={cx('flex items-center justify-between gap-3 mb-3 min-h-[28px]', className)}>
            <div className="flex items-center gap-2 min-w-0">
                <Tag className="m-overline text-ink-2 truncate">{label}</Tag>
                {typeof count === 'number' && <span className="m-chip m-chip-neutral !h-[22px] !px-2 !text-[12px]">{count}</span>}
            </div>
            {action}
        </div>
    )
}

// Empty state (spec 7.14): 64 icon tile, serif title, one line, optional action.
export function EmptyState({ icon, title, body, action, className }: { icon: ReactNode; title: ReactNode; body?: ReactNode; action?: ReactNode; className?: string }) {
    return (
        <div className={cx('flex flex-col items-center text-center px-6 py-8', className)}>
            <div aria-hidden className="w-16 h-16 rounded-[20px] flex items-center justify-center bg-[var(--m-surface-strong)] border border-line text-primary-text mb-4">
                {icon}
            </div>
            <h3 className="m-title-3 text-ink">{title}</h3>
            {body && <p className="m-body text-ink-2 mt-2 max-w-[280px]">{body}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    )
}
