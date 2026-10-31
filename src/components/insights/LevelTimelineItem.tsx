'use client'

import { LevelProgressBar } from './LevelProgressBar'
import { type LevelBenchmark } from '@/lib/utils/levels'
import { Check, Lock } from 'lucide-react'

export function LevelTimelineItem({
    benchmark,
    isCompleted,
    isCurrent,
    isLocked,
    totalXP,
    nextBenchmark,
    progress,
    xpRemaining,
    isLast
}: {
    benchmark: LevelBenchmark
    isCompleted: boolean
    isCurrent: boolean
    isLocked: boolean
    totalXP: number
    nextBenchmark: LevelBenchmark
    progress: number
    xpRemaining: number
    isLast: boolean
}) {
    return (
        <div className="flex items-start gap-3.5 relative">
            {/* Connecting line */}
            {!isLast && (
                <div
                    className="absolute left-[17px] top-[36px] w-[2px] bottom-0"
                    style={{
                        backgroundColor: isCompleted ? '#10B981' : isCurrent ? '#1951FC' : 'var(--line-strong)'
                    }}
                />
            )}

            {/* Indicator Badge Column */}
            <div className="flex-shrink-0 relative z-10">
                {isCompleted ? (
                    <div className="w-[36px] h-[36px] rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                    </div>
                ) : isCurrent ? (
                    <div
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center font-semibold text-[14px] text-white"
                        style={{
                            backgroundColor: '#1951FC',
                            boxShadow: '0 0 0 3px rgba(255, 107, 0, 0.25), 0 2px 10px rgba(255, 107, 0, 0.4)'
                        }}
                    >
                        {benchmark.level}
                    </div>
                ) : (
                    <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center border-2 border-line bg-[var(--m-surface-strong)]">
                        <Lock className="w-3.5 h-3.5 text-ink-2" />
                    </div>
                )}
            </div>

            {/* Level Info Column */}
            <div className={`flex-1 pb-6 ${isLocked ? 'opacity-55' : ''}`}>
                <div className="flex items-baseline justify-between">
                    <h4
                        className={`text-[14px] font-bold ${
                            isCurrent
                                ? 'text-primary-text'
                                : isCompleted
                                ? 'text-ink'
                                : 'text-ink-2'
                        }`}
                    >
                        Level {benchmark.level} — {benchmark.title}
                    </h4>
                </div>

                {/* Sub-info: Active Progress Box vs XP Required label */}
                {isCurrent ? (
                    <div className="mt-2.5 p-3 rounded-2xl bg-primary-soft border border-[color-mix(in_srgb,var(--primary)_40%,transparent)] space-y-2">
                        <p className="text-[12px] font-semibold text-ink-2">
                            {totalXP} XP / {nextBenchmark.xp} XP base
                        </p>
                        <div className="w-full bg-[var(--m-surface-strong)] rounded-full overflow-hidden h-2">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.max(progress, 2)}%`, backgroundColor: '#1951FC' }}
                            />
                        </div>
                        <p className="text-[11.5px] font-bold text-primary-text">
                            {Math.max(0, xpRemaining)} XP remaining to Level {nextBenchmark.level}
                        </p>
                    </div>
                ) : (
                    <p className="text-[12px] text-ink-2 font-medium mt-0.5">
                        {benchmark.xp} XP required
                    </p>
                )}
            </div>
        </div>
    )
}
