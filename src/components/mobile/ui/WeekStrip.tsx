import { Check } from 'lucide-react'
import { cx } from './cx'

export type WeekDayState = 'done' | 'missed' | 'future'

export interface WeekDay {
    key: string
    initial: string
    date: number
    state: WeekDayState
    isToday: boolean
    label: string // accessible label, e.g. "Monday, all habits done"
}

// Week strip (spec 7.11). Display only: 7 columns, dot above the day initial.
// Done = solid primary with a check, today = 36×56 gradient pill (check when done, an open ring
// when not yet), no habits due = surface-strong.
export function WeekStrip({ days, className }: { days: WeekDay[]; className?: string }) {
    return (
        <ol className={cx('grid grid-cols-7 gap-1', className)}>
            {days.map((d) => (
                <li key={d.key} aria-label={d.label} className="flex justify-center">
                    {/* Every column has the same two slots: a 28px mark on top, the letter below,
                        so the letters line up; today only adds the tall gradient pill behind them. */}
                    <span
                        className={cx(
                            'w-9 h-14 rounded-full flex flex-col items-center justify-between pt-1.5 pb-1.5',
                            d.isToday && 'bg-[image:var(--m-grad-primary)] shadow-[var(--m-glow)] text-snow',
                        )}
                    >
                        <span
                            aria-hidden
                            className={cx(
                                'w-7 h-7 rounded-full flex items-center justify-center',
                                !d.isToday && d.state === 'done' && 'bg-primary text-snow',
                                !d.isToday && d.state === 'missed' && 'border-[1.5px] border-line-strong',
                                !d.isToday && d.state === 'future' && 'bg-[var(--m-surface-strong)]',
                                d.isToday && d.state !== 'done' && 'border-[1.5px] border-snow/60',
                            )}
                        >
                            {d.state === 'done' && <Check size={d.isToday ? 16 : 14} strokeWidth={2.5} />}
                        </span>
                        <span aria-hidden className={cx('m-caption leading-4', d.isToday ? 'text-snow' : 'text-ink-2')}>{d.initial}</span>
                    </span>
                </li>
            ))}
        </ol>
    )
}
