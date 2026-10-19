'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { FREE_TIER_LIMITS } from '@/lib/featureGates'

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
    const searchParams = useSearchParams()
    const { t } = useTranslation()
    const isFree = userPlan === 'free'

    const [focusDuration, setFocusDuration] = useState('25')
    const [breakDuration, setBreakDuration] = useState('5')
    const [sets, setSets] = useState('4')
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
        <section className="bg-card-bg/20 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-4 mb-8 transition-colors">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-[20px] font-bold text-navy dark:text-slate-100">{t('focus.pomodoro')}</h2>
                <button
                    onClick={startSession}
                    className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-accent/95 transition-colors"
                >
                    {t('focus.start')}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-semibold text-navy dark:text-slate-300 mb-1">{t('focus.duration')}</label>
                    <div className="relative">
                        <input
                            type="number"
                            className={`w-full bg-card-bg/50 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg p-3 text-sm text-navy dark:text-slate-200 outline-none focus:ring-2 focus:ring-accent/20 ${isFree ? 'opacity-60' : ''}`}
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
                    <label className="block text-xs font-semibold text-navy dark:text-slate-300 mb-1">{t('focus.break')}</label>
                    <div className="relative">
                        <input
                            type="number"
                            className={`w-full bg-card-bg/50 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg p-3 text-sm text-navy dark:text-slate-200 outline-none focus:ring-2 focus:ring-accent/20 ${isFree ? 'opacity-60' : ''}`}
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
                <label className="block text-xs font-semibold text-navy dark:text-slate-300 mb-1">{t('focus.sets')}</label>
                <div className="relative">
                    <input
                        type="number"
                        className={`w-full bg-card-bg/50 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg p-3 text-sm text-navy dark:text-slate-200 outline-none focus:ring-2 focus:ring-accent/20 ${isFree ? 'opacity-60' : ''}`}
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
                            className={`py-2 rounded-lg text-sm font-medium transition-colors border relative flex items-center justify-center gap-1.5 ${isActive ? 'bg-navy dark:bg-slate-100 dark:text-slate-900 border-transparent' : 'bg-navy/10 dark:bg-slate-800 text-navy dark:text-slate-200 border-transparent dark:border-slate-700'} ${isLocked ? 'opacity-60' : ''}`}
                        >
                            {p.label}
                            {isLocked && <LockIcon />}
                        </button>
                    )
                })}
            </div>

            {/* Toast Notification */}
            {toast && (
                <div
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] max-w-[340px] w-auto bg-navy text-white text-[14px] text-center font-medium px-6 py-3 rounded-xl shadow-lg transition-all"
                    style={{ animation: 'fadeInDown 0.3s ease-out forwards' }}
                >
                    {toast}
                </div>
            )}
        </section>
    )
}
