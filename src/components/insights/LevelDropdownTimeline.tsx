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
            <div className="bg-[var(--m-surface)] border border-line rounded-[24px] p-5 mt-3 max-h-[65vh] overflow-y-auto">
                <h3 className="m-title-3 text-ink mb-4">Level timeline</h3>

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
