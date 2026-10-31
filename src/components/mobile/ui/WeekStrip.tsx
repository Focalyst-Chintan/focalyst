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
// Done = solid primary with a check, today = 36×56 gradient pill, future = surface-strong.
export function WeekStrip({ days, className }: { days: WeekDay[]; className?: string }) {
    return (
        <ol className={cx('grid grid-cols-7 gap-1', className)}>
            {days.map((d) => (
                <li key={d.key} aria-label={d.label} className="flex justify-center">
                    {d.isToday ? (
                        <span className="w-9 h-14 rounded-full bg-[image:var(--m-grad-primary)] shadow-[var(--m-glow)] text-snow flex flex-col items-center justify-center gap-1">
                            {d.state === 'done' ? (
                                <Check size={16} strokeWidth={2.5} aria-hidden />
                            ) : (
                                <span className="m-caption m-num leading-4">{d.date}</span>
                            )}
                            <span aria-hidden className="m-caption leading-4">{d.initial}</span>
                        </span>
                    ) : (
                        <span className="w-9 h-14 flex flex-col items-center justify-center gap-1">
                            <span
                                aria-hidden
                                className={cx(
                                    'w-7 h-7 rounded-full flex items-center justify-center',
                                    d.state === 'done' && 'bg-primary text-snow',
                                    d.state === 'missed' && 'border-[1.5px] border-line-strong',
                                    d.state === 'future' && 'bg-[var(--m-surface-strong)]',
                                )}
                            >
                                {d.state === 'done' && <Check size={14} strokeWidth={2.5} />}
                            </span>
                            <span aria-hidden className="m-caption text-ink-2 leading-4">{d.initial}</span>
                        </span>
                    )}
                </li>
            ))}
        </ol>
    )
}
