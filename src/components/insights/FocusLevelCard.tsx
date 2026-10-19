'use client'

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
            className="w-full text-left rounded-3xl p-5 relative overflow-hidden transition-all duration-300 active:scale-[0.98] shadow-lg"
            style={{
                background: 'linear-gradient(90deg, #F59E0B 0%, #FF6B2B 100%)',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25), 0 2px 8px rgba(255, 107, 43, 0.2)'
            }}
            aria-expanded={isOpen}
            aria-controls="level-timeline-dropdown"
        >
            {/* Subtle decorative circles */}
            <div
                className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 pointer-events-none"
                style={{ backgroundColor: 'white' }}
            />
            <div
                className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-[0.07] pointer-events-none"
                style={{ backgroundColor: 'white' }}
            />

            <div className="relative z-10 flex items-center gap-4">
                {/* Level Badge */}
                <div className="flex-shrink-0">
                    <div
                        className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center ${isLimitless ? 'legend-glow' : ''}`}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(8px)',
                            border: '2px solid rgba(255,255,255,0.3)'
                        }}
                    >
                        {/* Star icon matching mobile */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="mb-0.5">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span className="text-[11px] font-bold text-white leading-none tracking-tight">
                            Level {current.level}
                        </span>
                    </div>
                </div>

                {/* Level Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <h2 className="text-[18px] font-bold text-white leading-tight">
                            {current.title}
                        </h2>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-1.5">
                        <LevelProgressBar progress={progress} color="white" height={7} />
                    </div>

                    {/* Subtext info */}
                    <div className="text-[11.5px] font-medium text-white/90 leading-tight space-y-0.5">
                        <p>{totalXP} XP / {next.xp} XP base</p>
                        <p>{isLimitless ? 'Max Level reached' : `${Math.max(0, xpRemaining)} XP remaining to Level ${next.level}`}</p>
                    </div>
                </div>

                {/* Expand/Collapse Chevron */}
                <div className="flex-shrink-0 ml-1">
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </div>
        </button>
    )
}
