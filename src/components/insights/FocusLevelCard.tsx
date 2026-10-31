'use client'

import { ChevronDown, Star } from 'lucide-react'
import { LevelProgressBar } from './LevelProgressBar'
import { type LevelState } from '@/lib/utils/levels'

export function FocusLevelCard({
    levelState,
    isOpen,
    onToggle
}: {
    levelState: LevelState
    isOpen: boolean
    onToggle: () => void
}) {
    const { current, next, progress, totalXP, xpRemaining } = levelState
    const isLimitless = current.level === 15

    return (
        <button
            id="focus-level-card"
            onClick={onToggle}
            className="m-glass m-press w-full text-left p-5"
            aria-expanded={isOpen}
            aria-controls="level-timeline-dropdown"
        >
            <div className="relative flex items-center gap-4">
                {/* Level Badge */}
                <div className="flex-shrink-0">
                    <div className={`w-16 h-16 rounded-[16px] flex flex-col items-center justify-center bg-[image:var(--m-grad-primary)] text-snow shadow-[var(--m-glow)] ${isLimitless ? 'legend-glow' : ''}`}>
                        <Star size={18} strokeWidth={1.75} className="fill-current mb-0.5" aria-hidden />
                        <span className="m-caption !text-[11px] leading-none m-num">
                            Level {current.level}
                        </span>
                    </div>
                </div>

                {/* Level Info */}
                <div className="flex-1 min-w-0">
                    <h2 className="m-title-3 text-ink truncate mb-2">
                        {current.title}
                    </h2>

                    {/* Progress bar */}
                    <div className="mb-2">
                        <LevelProgressBar progress={progress} color="#3781FC" height={6} />
                    </div>

                    {/* Subtext info */}
                    <div className="m-caption text-ink-2 space-y-0.5 m-num">
                        <p>{totalXP} XP of {next.xp} XP</p>
                        <p>{isLimitless ? 'Top level reached' : `${Math.max(0, xpRemaining)} XP to level ${next.level}`}</p>
                    </div>
                </div>

                {/* Expand/Collapse Chevron */}
                <ChevronDown
                    size={20}
                    strokeWidth={1.75}
                    aria-hidden
                    className={`flex-shrink-0 text-ink-2 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </div>
        </button>
    )
}
