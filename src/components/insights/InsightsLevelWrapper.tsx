'use client'

import { useState, useEffect, useRef } from 'react'
import { FocusLevelCard } from './FocusLevelCard'
import { LevelDropdownTimeline } from './LevelDropdownTimeline'
import { LevelUpModal } from './LevelUpModal'
import { getLevelFromMinutes } from '@/lib/utils/levels'

const LEVEL_STORAGE_KEY = 'focalyst_last_known_level'

export function InsightsLevelWrapper({ totalFocusMinutes }: { totalFocusMinutes: number }) {
    const [isTimelineOpen, setIsTimelineOpen] = useState(false)
    const [showLevelUpModal, setShowLevelUpModal] = useState(false)
    const hasCheckedRef = useRef(false)

    const levelState = getLevelFromMinutes(totalFocusMinutes)

    // Detect level-up on mount
    useEffect(() => {
        if (hasCheckedRef.current) return
        hasCheckedRef.current = true

        try {
            const stored = localStorage.getItem(LEVEL_STORAGE_KEY)
            const lastKnownLevel = stored ? parseInt(stored, 10) : 0

            if (lastKnownLevel > 0 && levelState.current.level > lastKnownLevel) {
                // Level up detected!
                setShowLevelUpModal(true)
            }

            // Always persist current level
            localStorage.setItem(LEVEL_STORAGE_KEY, String(levelState.current.level))
        } catch {
            // localStorage not available — silently skip
        }
    }, [levelState.current.level])

    return (
        <div className="mb-4">
            <FocusLevelCard
                levelState={levelState}
                isOpen={isTimelineOpen}
                onToggle={() => setIsTimelineOpen(prev => !prev)}
            />

            <LevelDropdownTimeline
                levelState={levelState}
                isOpen={isTimelineOpen}
            />

            {showLevelUpModal && (
                <LevelUpModal
                    level={levelState.current}
                    onClose={() => setShowLevelUpModal(false)}
                />
            )}
        </div>
    )
}
