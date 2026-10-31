import type { ReactNode } from 'react'
import { AlertCircle, Archive, ArrowDownRight, ArrowUpRight, Check, ChevronDown, ChevronUp, ChevronsUp, CircleDot } from 'lucide-react'
import { cx } from './cx'

export type ChipTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'streak'

// Status chip (spec 7.7): 14% tint, 40% border, meaning text colour. Colour is never the only signal.
export function Chip({ tone = 'neutral', icon, children, className }: { tone?: ChipTone; icon?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <span className={cx('m-chip', `m-chip-${tone}`, className)}>
            {icon && <span aria-hidden className="m-chip-icon">{icon}</span>}
            {children}
        </span>
    )
}

const glyph = { size: 11, strokeWidth: 2.5 }

export type StatusKind = 'high' | 'medium' | 'low' | 'done' | 'today' | 'overdue' | 'passed'

const STATUS: Record<StatusKind, { tone: ChipTone; icon: ReactNode }> = {
    high: { tone: 'danger', icon: <ChevronsUp {...glyph} /> },
    medium: { tone: 'warning', icon: <ChevronUp {...glyph} /> },
    low: { tone: 'info', icon: <ChevronDown {...glyph} /> },
    done: { tone: 'success', icon: <Check {...glyph} /> },
    today: { tone: 'info', icon: <CircleDot {...glyph} /> },
    overdue: { tone: 'danger', icon: <AlertCircle {...glyph} /> },
    passed: { tone: 'neutral', icon: <Archive {...glyph} /> },
}

export function StatusChip({ kind, children, className }: { kind: StatusKind; children: ReactNode; className?: string }) {
    const s = STATUS[kind]
    return <Chip tone={s.tone} icon={s.icon} className={className}>{children}</Chip>
}

// Delta chip: always says what it compares to ("−9% vs last week").
export function DeltaChip({ value, comparedTo, className }: { value: number; comparedTo: string; className?: string }) {
    const up = value >= 0
    return (
        <Chip
            tone={up ? 'success' : 'danger'}
            icon={up ? <ArrowUpRight {...glyph} /> : <ArrowDownRight {...glyph} />}
            className={className}
        >
            {up ? '+' : '−'}{Math.abs(value)}% {comparedTo}
        </Chip>
    )
}

// Streak chip: warning text on a neutral fill; the flame emoji is allowed here only.
export function StreakChip({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <Chip tone="streak" className={className}>
            <span aria-hidden>🔥</span>
            {children}
        </Chip>
    )
}
