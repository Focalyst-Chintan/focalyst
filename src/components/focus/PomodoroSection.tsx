'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { FREE_TIER_LIMITS } from '@/lib/featureGates'
import { takeRecommendedPreset } from '@/lib/onboarding/plan'
import { ChevronDown, Lock, Play } from 'lucide-react'
import { HeroCard, MButton, Stepper } from '@/components/mobile/ui'
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
    // UI only: the Customise section is collapsed until opened
    const [customOpen, setCustomOpen] = useState(false)

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


    const focusNum = Number(focusDuration) || 0
    const breakNum = Number(breakDuration) || 0
    const setsNum = Number(sets) || 0

    return (
        <HeroCard grid className="p-6">
            <p className="m-overline text-ink-2">{t('focus.pomodoro')}</p>
            <p className="m-stat-xl text-ink mt-2" aria-label={`${focusNum} minutes of focus`}>
                {String(focusNum).padStart(2, '0')}:00
            </p>
            <p className="m-subhead text-ink-2 mt-1">
                {setsNum} {setsNum === 1 ? 'set' : 'sets'} · {breakNum} min {breakNum === 1 ? 'break' : 'breaks'}
            </p>

            <div className="flex gap-2 overflow-x-auto fx-no-scrollbar -mx-6 px-6 mt-5 pb-1" role="group" aria-label="Presets">
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
                            className={`m-pill m-press shrink-0 ${isLocked ? 'text-ink-2' : ''}`}
                        >
                            {presetLabel(p.label)}
                            {isLocked && <LockIcon />}
                        </button>
                    )
                })}
            </div>

            <button
                type="button"
                onClick={() => setCustomOpen((o) => !o)}
                aria-expanded={customOpen}
                className="m-press mt-3 -ml-1 inline-flex items-center gap-1.5 min-h-11 px-1 m-callout text-primary-text"
            >
                Customise
                {isFree && <span className="m-chip m-chip-info !h-6 !text-[12px]">Pro</span>}
                <ChevronDown size={18} strokeWidth={1.75} aria-hidden className={`transition-transform duration-200 ${customOpen ? 'rotate-180' : ''}`} />
            </button>

            {customOpen && (
                <div className="mt-1 mb-2 divide-y divide-line rounded-[16px] bg-[var(--m-surface-strong)] border border-line px-4 m-rise" title={isFree ? 'Custom timer is a Pro feature' : undefined}>
                    <Stepper label={t('focus.duration')} value={focusDuration} unit="min" onChange={setFocusDuration} disabled={isFree} trailing={isFree ? <LockIcon /> : undefined} />
                    <Stepper label={t('focus.break')} value={breakDuration} unit="min" onChange={setBreakDuration} disabled={isFree} trailing={isFree ? <LockIcon /> : undefined} />
                    <Stepper label={t('focus.sets')} value={sets} onChange={setSets} disabled={isFree} trailing={isFree ? <LockIcon /> : undefined} />
                </div>
            )}

            <MButton block className="mt-4" icon={<Play size={18} strokeWidth={2} className="fill-current" aria-hidden />} onClick={startSession}>
                {t('focus.start')}
            </MButton>

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
