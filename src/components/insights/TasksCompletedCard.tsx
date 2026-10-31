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
        <div className="m-glass p-5 flex justify-between items-center gap-4 w-full">
            <div className="space-y-1 min-w-0">
                <h3 className="m-headline text-ink">{t('insights.tasksCompleted')}</h3>
                <p className="m-footnote text-ink-2">{progressLine(completed, total)}</p>
                <div className="pt-2 flex items-baseline">
                    <span className="m-stat-l text-ink mr-2">
                        <AnimatedNumber metric="tasks:today" value={completed} label={`${completed}`} render={(n) => n} />
                    </span>
                    <span className="m-subhead text-ink-2 m-num">{t('insights.tasksCount', { count: total })}</span>
                </div>
            </div>
            <Ring size={96} stroke={10} progress={percentage / 100} label={`${percentage}% done`}>
                <span className="m-callout !font-semibold text-ink m-num">{percentage}%</span>
            </Ring>
        </div>
    )
}
