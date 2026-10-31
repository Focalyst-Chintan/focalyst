'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { FREE_TIER_LIMITS } from '@/lib/featureGates'
import { takeRecommendedPreset } from '@/lib/onboarding/plan'
import { Lock, Play } from 'lucide-react'
import { HeroCard } from '@/components/mobile/ui'
import { plainCopy } from '@/components/mobile/copy'

const POMODORO_PRESETS = [
    { label: '25/5×4', focusMinutes: 25, breakMinutes: 5, sets: 4 },
    { label: '45/10×3', focusMinutes: 45, breakMinutes: 10, sets: 3 },
    { label: '60/15×2', focusMinutes: 60, breakMinutes: 15, sets: 2 },
    { label: '90/30×2', focusMinutes: 90, breakMinutes: 30, sets: 2 },
]

// Lock icon for Pro-only presets and fields
const LockIcon = () => <Lock size={14} strokeWidth={1.75} aria-hidden />

// Display only: "25/5×4" reads as "25/5 ×4"
const presetLabel = (label: string) => label.replace('×', ' ×')

export default function PomodoroSection({ userPlan }: { userPlan: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { t } = useTranslation()
    const isFree = userPlan === 'free'

    // The onboarding plan's rhythm, selected once (7.1), when the plan allows it
    const [recommended] = useState(() => (typeof window === 'undefined' ? null : takeRecommendedPreset(!isFree)))
    const [focusDuration, setFocusDuration] = useState(String(recommended?.focusMinutes ?? 25))
    const [breakDuration, setBreakDuration] = useState(String(recommended?.breakMinutes ?? 5))
    const [sets, setSets] = useState(String(recommended?.sets ?? 4))
    const [toast, setToast] = useState<string | null>(null)

    useEffect(() => {
        const completed = searchParams.get('completed')
        if (completed === 'true') {
            setToast(t('focus.wellDone') + '! ' + t('focus.greatJob') + '. 🎉')
            const params = new URLSearchParams(searchParams.toString())
            params.delete('completed')
            const newQuery = params.toString()
            router.replace(`/focus${newQuery ? `?${newQuery}` : ''}`)
        }
    }, [searchParams, router, t])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const startSession = () => {
        // Validation check for free user if custom values are used
        const isPreset = POMODORO_PRESETS.some(
            p => p.focusMinutes.toString() === focusDuration &&
                p.breakMinutes.toString() === breakDuration &&
                p.sets.toString() === sets
        )

        if (isFree && !isPreset) {
            router.push('/paywall')
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
        <HeroCard className="p-5 mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="m-title-3 text-ink">{t('focus.pomodoro')}</h2>
                <button
                    onClick={startSession}
                    className="m-btn m-btn-primary m-btn-sm m-press"
                >
                    <Play size={16} strokeWidth={2} className="fill-current" aria-hidden />
                    {t('focus.start')}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="m-label !mb-1.5">{t('focus.duration')}</label>
                    <div className="relative">
                        <input
                            type="number"
                            className={`m-input m-num ${isFree ? 'opacity-60' : ''}`}
                            value={focusDuration}
                            onChange={(e) => setFocusDuration(e.target.value)}
                            disabled={isFree}
                        />
                        {isFree && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-2" title="Custom timer is a Pro feature. Upgrade to unlock.">
                                <LockIcon />
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <label className="m-label !mb-1.5">{t('focus.break')}</label>
                    <div className="relative">
                        <input
                            type="number"
                            className={`m-input m-num ${isFree ? 'opacity-60' : ''}`}
                            value={breakDuration}
                            onChange={(e) => setBreakDuration(e.target.value)}
                            disabled={isFree}
                        />
                        {isFree && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-2" title="Custom timer is a Pro feature. Upgrade to unlock.">
                                <LockIcon />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mb-5">
                    <label className="m-label !mb-1.5">{t('focus.sets')}</label>
                    <div className="relative">
                        <input
                            type="number"
                            className={`m-input m-num ${isFree ? 'opacity-60' : ''}`}
                            value={sets}
                            onChange={(e) => setSets(e.target.value)}
                            disabled={isFree}
                        />
                        {isFree && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-2" title="Custom timer is a Pro feature. Upgrade to unlock.">
                                <LockIcon />
                            </div>
                        )}
                    </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                {POMODORO_PRESETS.map((p, index) => {
                    const isActive = p.focusMinutes.toString() === focusDuration &&
                        p.breakMinutes.toString() === breakDuration &&
                        p.sets.toString() === sets;

                    const isLocked = isFree && index >= FREE_TIER_LIMITS.pomodoroPresets;

                    return (
                        <button
                            key={p.label}
                            onClick={() => {
                                if (isLocked) {
                                    router.push('/paywall');
                                    return;
                                }
                                setPreset(p.focusMinutes, p.breakMinutes, p.sets);
                            }}
                            aria-pressed={isActive}
                            className={`m-pill m-press w-full ${isLocked ? 'opacity-60' : ''}`}
                        >
                            {presetLabel(p.label)}
                            {isLocked && <LockIcon />}
                        </button>
                    )
                })}
            </div>

            {/* Toast Notification */}
            {toast && (
                <div
                    role="status"
                    className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-[100] max-w-[340px] w-max m-blur border border-line text-ink m-subhead px-5 py-3 rounded-full shadow-[var(--shadow-glass)] animate-[m-rise_200ms_var(--ease)_both]"
                >
                    {plainCopy(toast)}
                </div>
            )}
        </HeroCard>
    )
}
