'use client'

import { useTranslation } from 'react-i18next'
import { Ring } from '@/components/mobile/ui'
import { AnimatedNumber } from '@/components/mobile/insights/AnimatedNumber'

// Display only: the line under the number (spec 10.6 copy fix). The counts are today's tasks.
function progressLine(completed: number, total: number): string {
    if (total === 0) return 'No tasks on your list yet.'
    const left = total - completed
    if (left <= 0) return 'All done for today.'
    return `Nearly there. ${left} ${left === 1 ? 'task' : 'tasks'} to go.`
}

export function TasksCompletedCard({ completed, total }: { completed: number, total: number }) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const { t } = useTranslation()

    return (
        <div className="m-glass m-glass-md p-4 flex justify-between items-center gap-4 w-full min-h-[104px]">
            <div className="min-w-0">
                <h3 className="m-footnote text-ink-2">{t('insights.tasksCompleted')}</h3>
                <p className="mt-1 flex items-baseline gap-1.5">
                    <span className="m-stat-l text-ink">
                        <AnimatedNumber metric="tasks:today" value={completed} label={`${completed} of ${total} tasks`} render={(n) => n} />
                    </span>
                    <span className="m-subhead text-ink-2 m-num">/ {total}</span>
                </p>
                <p className="m-footnote text-ink-2 mt-1">{progressLine(completed, total)}</p>
            </div>
            <Ring size={56} stroke={6} progress={percentage / 100} label={`${percentage}% done`}>
                <span className="m-caption text-ink m-num">{percentage}%</span>
            </Ring>
        </div>
    )
}
