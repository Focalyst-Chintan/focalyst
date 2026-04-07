'use client'

import { LevelProgressBar } from './LevelProgressBar'
import { type LevelState } from '@/lib/utils/levels'
import { formatFocusTime } from '@/lib/utils/levels'

export function FocusLevelCard({
    levelState,
    isOpen,
    onToggle
}: {
    levelState: LevelState
    isOpen: boolean
    onToggle: () => void
}) {
    const { current, next, progress, totalMinutes } = levelState
    const isLimitless = current.level === 15

    return (
        <button
            id="focus-level-card"
            onClick={onToggle}
            className="w-full text-left rounded-3xl p-5 relative overflow-hidden transition-all duration-300 active:scale-[0.98]"
            style={{
                background: current.gradient,
                boxShadow: `0 8px 24px ${current.color}30, 0 2px 8px ${current.color}20`
            }}
            aria-expanded={isOpen}
            aria-controls="level-timeline-dropdown"
        >
            {/* Subtle decorative circles */}
            <div
                className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
                style={{ backgroundColor: 'white' }}
            />
            <div
                className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-[0.07]"
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
                        {/* Medal / Badge icon */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mb-0.5 opacity-80">
                            <path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" fill="white" />
                        </svg>
                        <span className="text-[11px] font-bold text-white leading-none tracking-wide">
                            Level
                        </span>
                        <span className="text-[18px] font-black text-white leading-none">
                            {current.level}
                        </span>
                    </div>
                </div>

                {/* Level Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-[18px] font-bold text-white leading-tight">
                            Level {current.level} &apos;{current.name}&apos;
                        </h2>
                    </div>
                    <p className="text-[13px] text-white/80 font-medium mb-3">
                        Total Focus Time: <span className="font-bold text-white">{formatFocusTime(totalMinutes)}</span>
                    </p>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <LevelProgressBar progress={progress} color="white" height={7} />
                        </div>
                        {next && (
                            <span className="text-[11px] text-white/70 font-semibold flex-shrink-0">
                                Level {next.level}
                            </span>
                        )}
                        {!next && (
                            <span className="text-[11px] text-white/70 font-semibold flex-shrink-0">
                                MAX
                            </span>
                        )}
                    </div>
                </div>

                {/* Expand/Collapse Chevron */}
                <div className="flex-shrink-0 ml-1">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`chevron-rotate ${isOpen ? 'open' : ''}`}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </div>
        </button>
    )
}
