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
                        backgroundColor: isCompleted ? '#10B981' : isCurrent ? '#FF6B00' : '#E2E8F0'
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
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center font-black text-[14px] text-white"
                        style={{
                            backgroundColor: '#FF6B00',
                            boxShadow: '0 0 0 3px rgba(255, 107, 0, 0.25), 0 2px 10px rgba(255, 107, 0, 0.4)'
                        }}
                    >
                        {benchmark.level}
                    </div>
                ) : (
                    <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center border-2 border-slate-200 dark:border-[#222A41] bg-slate-50 dark:bg-[#0B1021]">
                        <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    </div>
                )}
            </div>

            {/* Level Info Column */}
            <div className={`flex-1 pb-6 ${isLocked ? 'opacity-55' : ''}`}>
                <div className="flex items-baseline justify-between">
                    <h4
                        className={`text-[14px] font-bold ${
                            isCurrent
                                ? 'text-[#FF6B00]'
                                : isCompleted
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        Level {benchmark.level} — {benchmark.title}
                    </h4>
                </div>

                {/* Sub-info: Active Progress Box vs XP Required label */}
                {isCurrent ? (
                    <div className="mt-2.5 p-3 rounded-2xl bg-orange-50/70 dark:bg-[#0B1021] border border-[#FF6B00] shadow-sm space-y-2">
                        <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                            {totalXP} XP / {nextBenchmark.xp} XP base
                        </p>
                        <div className="w-full bg-orange-100 dark:bg-orange-950/40 rounded-full overflow-hidden h-2">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.max(progress, 2)}%`, backgroundColor: '#FF6B00' }}
                            />
                        </div>
                        <p className="text-[11.5px] font-bold text-[#FF6B00]">
                            {Math.max(0, xpRemaining)} XP remaining to Level {nextBenchmark.level}
                        </p>
                    </div>
                ) : (
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {benchmark.xp} XP required
                    </p>
                )}
            </div>
        </div>
    )
}
