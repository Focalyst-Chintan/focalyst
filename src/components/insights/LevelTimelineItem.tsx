'use client'

import { LevelProgressBar } from './LevelProgressBar'
import { type LevelDefinition } from '@/lib/utils/levels'
import { formatFocusTime, formatThresholdHours } from '@/lib/utils/levels'

type ItemState = 'completed' | 'current' | 'future'

export function LevelTimelineItem({
    levelDef,
    state,
    currentMinutes,
    nextLevel,
    animationDelay,
    isLast
}: {
    levelDef: LevelDefinition
    state: ItemState
    currentMinutes: number
    nextLevel: LevelDefinition | null
    animationDelay: number
    isLast: boolean
}) {
    const progress = state === 'current' && nextLevel
        ? Math.min(Math.round(((currentMinutes - levelDef.thresholdMinutes) / (nextLevel.thresholdMinutes - levelDef.thresholdMinutes)) * 100), 100)
        : 0

    return (
        <div
            className="timeline-item-enter flex items-start gap-3 relative"
            style={{ animationDelay: `${animationDelay}ms` }}
        >
            {/* Connecting line */}
            {!isLast && (
                <div
                    className="absolute left-[17px] top-[36px] w-[2px] bottom-0"
                    style={{
                        backgroundColor: state === 'completed' ? levelDef.color : state === 'current' ? levelDef.color : '#E5E7EB'
                    }}
                />
            )}

            {/* Badge circle */}
            <div className="flex-shrink-0 relative z-10">
                {state === 'completed' ? (
                    <div
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center"
                        style={{
                            backgroundColor: levelDef.color,
                            boxShadow: `0 2px 8px ${levelDef.color}40`
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                ) : state === 'current' ? (
                    <div
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center level-pulse"
                        style={{
                            '--level-color': levelDef.color,
                            backgroundColor: levelDef.color,
                            boxShadow: `0 0 0 3px ${levelDef.colorLight}, 0 2px 12px ${levelDef.color}50`
                        } as React.CSSProperties}
                    >
                        <span className="text-[13px] font-black text-white">{levelDef.level}</span>
                    </div>
                ) : (
                    <div
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center border-2"
                        style={{
                            backgroundColor: '#F9FAFB',
                            borderColor: '#E5E7EB'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={`flex-1 pb-6 ${state === 'future' ? 'opacity-45' : ''}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span
                                className={`text-[14px] font-bold ${state === 'current' ? '' : state === 'completed' ? 'text-navy' : 'text-gray-400'}`}
                                style={state === 'current' ? { color: levelDef.color } : undefined}
                            >
                                Level {levelDef.level}
                            </span>
                            <span className={`text-[13px] font-semibold ${state === 'completed' ? 'text-navy-dark' : state === 'current' ? 'text-navy' : 'text-gray-400'}`}>
                                {levelDef.name}
                            </span>
                        </div>
                        <span className={`text-[12px] ${state === 'future' ? 'text-gray-400' : 'text-blue-muted'}`}>
                            {formatThresholdHours(levelDef.thresholdMinutes)}
                        </span>
                    </div>
                </div>

                {/* Current level progress bar */}
                {state === 'current' && nextLevel && (
                    <div className="mt-2.5">
                        <LevelProgressBar
                            progress={progress}
                            color={levelDef.color}
                            height={5}
                            className="mb-1.5"
                        />
                        <p className="text-[11px] text-blue-muted font-medium">
                            {formatFocusTime(currentMinutes)} / {formatThresholdHours(nextLevel.thresholdMinutes)} to Level {nextLevel.level}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
