'use client'

import { LevelTimelineItem } from './LevelTimelineItem'
import { LEVELS, type LevelState } from '@/lib/utils/levels'

export function LevelDropdownTimeline({
    levelState,
    isOpen
}: {
    levelState: LevelState
    isOpen: boolean
}) {
    const { current, next, totalMinutes } = levelState

    function getItemState(levelDef: typeof LEVELS[0]): 'completed' | 'current' | 'future' {
        if (levelDef.level < current.level) return 'completed'
        if (levelDef.level === current.level) return 'current'
        return 'future'
    }

    return (
        <div
            id="level-timeline-dropdown"
            className="overflow-hidden transition-all duration-500 ease-in-out"
            style={{
                maxHeight: isOpen ? '70vh' : '0px',
                opacity: isOpen ? 1 : 0,
            }}
        >
            <div className="bg-white rounded-3xl p-5 shadow-sm mt-3 max-h-[60vh] overflow-y-auto">
                <h3 className="text-[15px] font-bold text-navy mb-4">Level Timeline</h3>

                <div className="relative">
                    {LEVELS.map((levelDef, index) => (
                        <LevelTimelineItem
                            key={levelDef.level}
                            levelDef={levelDef}
                            state={getItemState(levelDef)}
                            currentMinutes={totalMinutes}
                            nextLevel={index + 1 < LEVELS.length ? LEVELS[index + 1] : null}
                            animationDelay={isOpen ? index * 40 : 0}
                            isLast={index === LEVELS.length - 1}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
