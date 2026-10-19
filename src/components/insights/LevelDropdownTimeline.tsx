'use client'

import { LevelTimelineItem } from './LevelTimelineItem'
import { LEVEL_BENCHMARKS, type LevelState } from '@/lib/utils/levels'

export function LevelDropdownTimeline({
    levelState,
    isOpen
}: {
    levelState: LevelState
    isOpen: boolean
}) {
    const { current, next, totalXP, progress, xpRemaining } = levelState

    return (
        <div
            id="level-timeline-dropdown"
            className="overflow-hidden transition-all duration-500 ease-in-out"
            style={{
                maxHeight: isOpen ? '75vh' : '0px',
                opacity: isOpen ? 1 : 0,
            }}
        >
            <div className="bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-3xl p-5 shadow-sm mt-3 max-h-[65vh] overflow-y-auto">
                <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-4">Level Timeline</h3>

                <div className="relative">
                    {LEVEL_BENCHMARKS.map((benchmark, index) => {
                        const isCompleted = totalXP >= benchmark.xp && benchmark.level !== current.level
                        const isCurrent = benchmark.level === current.level
                        const isLocked = totalXP < benchmark.xp

                        return (
                            <LevelTimelineItem
                                key={benchmark.level}
                                benchmark={benchmark}
                                isCompleted={isCompleted}
                                isCurrent={isCurrent}
                                isLocked={isLocked}
                                totalXP={totalXP}
                                nextBenchmark={next}
                                progress={progress}
                                xpRemaining={xpRemaining}
                                isLast={index === LEVEL_BENCHMARKS.length - 1}
                            />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
