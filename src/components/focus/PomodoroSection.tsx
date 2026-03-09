'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const POMODORO_PRESETS = [
    { label: '25/5×4', focusMinutes: 25, breakMinutes: 5, sets: 4 },
    { label: '45/10×3', focusMinutes: 45, breakMinutes: 10, sets: 3 },
    { label: '60/15×2', focusMinutes: 60, breakMinutes: 15, sets: 2 },
    { label: '90/30×2', focusMinutes: 90, breakMinutes: 30, sets: 2 },
]

// Lock SVG
const LockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#95A7B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
)

export default function PomodoroSection({ userPlan }: { userPlan: string }) {
    const router = useRouter()
    const isFree = userPlan === 'free'

    const [focusDuration, setFocusDuration] = useState('25')
    const [breakDuration, setBreakDuration] = useState('5')
    const [sets, setSets] = useState('4')

    const startSession = () => {
        // Validation check for free user if custom values are used
        const isPreset = POMODORO_PRESETS.some(
            p => p.focusMinutes.toString() === focusDuration &&
                p.breakMinutes.toString() === breakDuration &&
                p.sets.toString() === sets
        )

        if (isFree && !isPreset) {
            alert('Custom Pomodoro configuration is a Pro feature.') // Replace with upgrade modal
            return
        }

        // Navigate to active timer
        router.push(`/focus/timer?focus=${focusDuration}&break=${breakDuration}&sets=${sets}`)
    }

    const setPreset = (focus: number, brk: number, numSets: number) => {
        setFocusDuration(focus.toString())
        setBreakDuration(brk.toString())
        setSets(numSets.toString())
    }


    return (
        <section className="bg-card-bg/20 rounded-2xl p-4 mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-[20px] font-bold text-navy">Pomodoro</h2>
                <button
                    onClick={startSession}
                    className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-semibold"
                >
                    Start Session
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-semibold text-navy mb-1">Focus Duration</label>
                    <div className="relative">
                        <input
                            type="number"
                            className={`w-full bg-card-bg/50 rounded-lg p-3 text-sm text-navy outline-none ${isFree ? 'opacity-60' : ''}`}
                            value={focusDuration}
                            onChange={(e) => setFocusDuration(e.target.value)}
                            disabled={isFree}
                        />
                        {isFree && (
                            <div className="absolute right-3 top-3" title="Custom timer is a Pro feature. Upgrade to unlock.">
                                <LockIcon />
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-navy mb-1">Break Duration</label>
                    <div className="relative">
                        <input
                            type="number"
                            className={`w-full bg-card-bg/50 rounded-lg p-3 text-sm text-navy outline-none ${isFree ? 'opacity-60' : ''}`}
                            value={breakDuration}
                            onChange={(e) => setBreakDuration(e.target.value)}
                            disabled={isFree}
                        />
                        {isFree && (
                            <div className="absolute right-3 top-3" title="Custom timer is a Pro feature. Upgrade to unlock.">
                                <LockIcon />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-xs font-semibold text-navy mb-1">Number of Sets</label>
                <div className="relative">
                    <input
                        type="number"
                        className={`w-full bg-card-bg/50 rounded-lg p-3 text-sm text-navy outline-none ${isFree ? 'opacity-60' : ''}`}
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                        disabled={isFree}
                    />
                    {isFree && (
                        <div className="absolute right-3 top-3" title="Custom timer is a Pro feature. Upgrade to unlock.">
                            <LockIcon />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {POMODORO_PRESETS.map((p) => {
                    const isActive = p.focusMinutes.toString() === focusDuration &&
                        p.breakMinutes.toString() === breakDuration &&
                        p.sets.toString() === sets;

                    const isLocked = isFree && p.label !== '25/5×4';

                    return (
                        <button
                            key={p.label}
                            onClick={() => {
                                if (isLocked) {
                                    alert('Upgrade to Pro to unlock this preset.');
                                    return;
                                }
                                setPreset(p.focusMinutes, p.breakMinutes, p.sets);
                            }}
                            className={`py-2 rounded-lg text-sm font-medium transition-colors relative flex items-center justify-center gap-1.5 ${isActive ? 'bg-navy text-white' : 'bg-navy/10 text-navy'} ${isLocked ? 'opacity-60' : ''}`}
                        >
                            {p.label}
                            {isLocked && <LockIcon />}
                        </button>
                    )
                })}
            </div>
        </section>
    )
}
