'use client'

import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { localDateStr } from '@/lib/utils/date'
import { SeamlessRadialTimerDial } from '@/components/focus/SeamlessRadialTimerDial'
import { Maximize2, Minimize2, Pause, Play, RotateCcw, ArrowLeft } from 'lucide-react'

import { useIsDesktop } from '@/hooks/useIsDesktop'

function useNow(ms = 250) {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), ms)
        return () => clearInterval(t)
    }, [ms])
    return now
}

function MobileTimerDisplay({
    endsAt,
    isActive,
    pausedTimeLeft,
    dialSize,
    isLandscape,
    phaseTotalSeconds,
    onExpire,
}: {
    endsAt: number | null
    isActive: boolean
    pausedTimeLeft: number
    dialSize: number
    isLandscape: boolean
    phaseTotalSeconds: number
    onExpire: () => void
}) {
    const now = useNow(250)
    const leftMs = isActive && endsAt ? Math.max(0, endsAt - now) : pausedTimeLeft * 1000
    const leftSecs = Math.max(0, Math.ceil(leftMs / 1000))
    const mm = String(Math.floor(leftMs / 60000)).padStart(2, '0')
    const ss = String(Math.floor((leftMs % 60000) / 1000)).padStart(2, '0')

    useEffect(() => {
        if (isActive) {
            document.title = `${mm}:${ss} · Focus`
        }
    }, [isActive, mm, ss])

    const hasExpiredRef = useRef(false)
    useEffect(() => {
        if (!isActive) {
            hasExpiredRef.current = false
        }
    }, [isActive])

    useEffect(() => {
        if (isActive && endsAt && now >= endsAt && !hasExpiredRef.current) {
            hasExpiredRef.current = true
            onExpire()
        }
    }, [isActive, endsAt, now, onExpire])

    const progress = phaseTotalSeconds > 0 ? (phaseTotalSeconds - leftSecs) / phaseTotalSeconds : 0

    return (
        <SeamlessRadialTimerDial progress={progress} size={dialSize}>
            <div className={`font-extrabold tracking-tight tabular-nums whitespace-nowrap text-slate-900 dark:text-white leading-none ${
                isLandscape
                    ? 'text-[104px] sm:text-[112px]'
                    : 'text-[68px] sm:text-[76px]'
            }`}>
                {mm}:{ss}
            </div>
        </SeamlessRadialTimerDial>
    )
}

function TimerContent() {
    const searchParams = useSearchParams()
    const { t } = useTranslation()
    const router = useRouter()
    const isDesktop = useIsDesktop()
    const supabase = createClient()
    const { user } = useAuth()

    useEffect(() => {
        if (isDesktop === true) {
            router.replace('/focus')
        }
    }, [isDesktop, router])

    if (isDesktop === true) {
        return null
    }

    const focusMins = parseInt(searchParams.get('focus') || '25', 10)
    const breakMins = parseInt(searchParams.get('break') || '5', 10)
    const totalSets = parseInt(searchParams.get('sets') || '4', 10)

    const [mode, setMode] = useState<'FOCUS' | 'BREAK' | 'DONE'>('FOCUS')
    const [currentSet, setCurrentSet] = useState(1)
    const [isActive, setIsActive] = useState(true)
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Store endsAt timestamp in state so page does not re-render every second
    const [endsAt, setEndsAt] = useState<number | null>(() => Date.now() + focusMins * 60 * 1000)
    const [pausedTimeLeft, setPausedTimeLeft] = useState(focusMins * 60)

    // Reset document.title when timer stops or component unmounts
    useEffect(() => {
        if (!isActive) {
            document.title = 'Focalyst · Plan, focus and build habits'
        }
        return () => {
            document.title = 'Focalyst · Plan, focus and build habits'
        }
    }, [isActive])

    // Window dimensions for landscape / desk-clock mode
    const [dimensions, setDimensions] = useState({ width: 400, height: 800 })

    const wakeLock = useRef<WakeLockSentinel | null>(null)
    const lastSavedElapsedSecsRef = useRef(0)
    const completedRef = useRef(false)

    // Track window dimensions
    useEffect(() => {
        const updateDims = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            })
        }
        updateDims()
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => updateDims())
            ro.observe(document.documentElement)
            return () => ro.disconnect()
        } else {
            window.addEventListener('resize', updateDims)
            return () => window.removeEventListener('resize', updateDims)
        }
    }, [])

    const isLandscape = dimensions.width > dimensions.height

    // Screen WakeLock API
    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try {
                    wakeLock.current = await navigator.wakeLock.request('screen')
                } catch (err) {
                    console.error('WakeLock API unsupported or failed:', err)
                }
            }
        }
        requestWakeLock()
        return () => {
            if (wakeLock.current) wakeLock.current.release()
        }
    }, [])



    // Resilient incremental save to Supabase
    const recordFocusActivityToSupabase = useCallback(async (focusMinsToAdd: number, breakMinsToAdd: number) => {
        if (!user || (focusMinsToAdd <= 0 && breakMinsToAdd <= 0)) return
        const dateStr = localDateStr()

        try {
            // 1. Try RPC first
            try {
                await supabase.rpc('increment_daily_focus', {
                    p_focus_minutes: focusMinsToAdd,
                    p_break_minutes: breakMinsToAdd,
                    p_date: dateStr,
                })
            } catch {
                // Ignore RPC missing error and proceed to table upsert
            }

            // 2. Query and upsert daily_focus_activity
            const { data: existingData } = await supabase
                .from('daily_focus_activity')
                .select('focus_time_minutes, focus_minutes, break_time_minutes, break_minutes')
                .eq('user_id', user.id)
                .eq('date', dateStr)
                .maybeSingle()

            const existingFocus = existingData?.focus_time_minutes ?? existingData?.focus_minutes ?? 0
            const existingBreak = existingData?.break_time_minutes ?? existingData?.break_minutes ?? 0

            await supabase
                .from('daily_focus_activity')
                .upsert({
                    user_id: user.id,
                    date: dateStr,
                    focus_time_minutes: existingFocus + focusMinsToAdd,
                    break_time_minutes: existingBreak + breakMinsToAdd,
                }, { onConflict: 'user_id,date' })

            // 3. Increment users total_focus_minutes if column exists
            try {
                const { data: uData } = await supabase
                    .from('users')
                    .select('total_focus_minutes')
                    .eq('id', user.id)
                    .single()

                if (uData && typeof uData.total_focus_minutes === 'number') {
                    await supabase
                        .from('users')
                        .update({ total_focus_minutes: uData.total_focus_minutes + focusMinsToAdd })
                        .eq('id', user.id)
                }
            } catch {}

            // 4. Log session in pomodoro_sessions
            try {
                await supabase.from('pomodoro_sessions').insert([{
                    user_id: user.id,
                    focus_minutes: focusMinsToAdd,
                    break_minutes: breakMinsToAdd,
                    sets_planned: totalSets,
                    sets_completed: currentSet,
                    started_at: new Date(Date.now() - (focusMinsToAdd + breakMinsToAdd) * 60000).toISOString(),
                    was_completed: focusMinsToAdd > 0,
                }])
            } catch {}

            // 5. Notify Insights and other views
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('focalyst:focus-updated'))
            }
        } catch (err) {
            console.error('Error recording focus activity:', err)
        }
    }, [supabase, user, totalSets, currentSet])

    // Save partial elapsed time when leaving or ending
    const savePartialElapsedTime = useCallback(async () => {
        const phaseTotalSeconds = (mode === 'FOCUS' ? focusMins : breakMins) * 60
        const currentRemaining = endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : pausedTimeLeft
        const totalElapsedSecs = Math.max(0, phaseTotalSeconds - currentRemaining)
        const unsavedSecs = Math.max(0, totalElapsedSecs - lastSavedElapsedSecsRef.current)
        const unsavedMins = Math.floor(unsavedSecs / 60)

        if (unsavedMins >= 1) {
            lastSavedElapsedSecsRef.current += unsavedMins * 60
            if (mode === 'FOCUS') {
                await recordFocusActivityToSupabase(unsavedMins, 0)
            } else if (mode === 'BREAK') {
                await recordFocusActivityToSupabase(0, unsavedMins)
            }
        }
    }, [mode, focusMins, breakMins, endsAt, pausedTimeLeft, recordFocusActivityToSupabase])

    // Session completion handler
    const handleSessionCompletion = useCallback(async () => {
        if (completedRef.current) return
        completedRef.current = true

        setIsActive(false)
        setEndsAt(null)
        setPausedTimeLeft(0)

        // Save last completed focus set
        await recordFocusActivityToSupabase(focusMins, 0)

        if (wakeLock.current) {
            try {
                await wakeLock.current.release()
                wakeLock.current = null
            } catch {}
        }

        router.push('/focus?completed=true')
    }, [focusMins, recordFocusActivityToSupabase, router])

    // Handle end of single phase
    const handleTimeUp = useCallback(async () => {
        if (mode === 'FOCUS') {
            // Save this completed focus set incrementally
            await recordFocusActivityToSupabase(focusMins, 0)
            lastSavedElapsedSecsRef.current = 0

            if (currentSet < totalSets) {
                setMode('BREAK')
                setPausedTimeLeft(breakMins * 60)
                setEndsAt(Date.now() + breakMins * 60 * 1000)
            } else {
                handleSessionCompletion()
            }
        } else if (mode === 'BREAK') {
            // Save this completed break set incrementally
            await recordFocusActivityToSupabase(0, breakMins)
            lastSavedElapsedSecsRef.current = 0

            setMode('FOCUS')
            setCurrentSet((s) => s + 1)
            setPausedTimeLeft(focusMins * 60)
            setEndsAt(Date.now() + focusMins * 60 * 1000)
        }
    }, [mode, currentSet, totalSets, breakMins, focusMins, recordFocusActivityToSupabase, handleSessionCompletion])

    // Exit & End button action with partial save
    const handleEndSession = async () => {
        await savePartialElapsedTime()
        router.push('/focus')
    }

    const togglePauseResume = () => {
        if (isActive) {
            // Pausing
            if (endsAt) {
                const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
                setPausedTimeLeft(remaining)
            }
            setEndsAt(null)
            setIsActive(false)
        } else {
            // Resuming
            const now = Date.now()
            setEndsAt(now + pausedTimeLeft * 1000)
            setIsActive(true)
        }
    }

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {})
            setIsFullscreen(true)
        } else {
            document.exitFullscreen?.().catch(() => {})
            setIsFullscreen(false)
        }
    }

    const totalPhaseSecs = (mode === 'FOCUS' ? focusMins : breakMins) * 60

    // Dial sizes
    const dialSize = isLandscape
        ? Math.max(195, Math.min(dimensions.height - 135, 235))
        : Math.min(dimensions.width * 0.84, 330)

    return (
        <div className={`min-h-screen bg-[#F4F7FA] dark:bg-[#0B1021] text-slate-900 dark:text-white flex flex-col items-center justify-between transition-colors select-none ${
            isLandscape ? 'py-3 px-6' : 'p-6'
        }`}>
            {/* Top Bar */}
            <div className="w-full max-w-xl flex items-center justify-between">
                <button
                    onClick={handleEndSession}
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-[#151B2E] text-slate-500 dark:text-slate-400 transition-colors"
                    aria-label="Back to focus"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                        isLandscape ? 'text-[10px]' : 'text-xs'
                    } ${
                        mode === 'FOCUS'
                            ? 'bg-blue-50 dark:bg-blue-500/15 text-[#2B6BFF]'
                            : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500'
                    }`}>
                        {mode === 'FOCUS' ? t('focus.focusTime') : 'Break Time'}
                    </span>
                    <span className={`font-semibold text-slate-500 dark:text-slate-400 ${
                        isLandscape ? 'text-xs' : 'text-sm'
                    }`}>
                        Set {currentSet}/{totalSets}
                    </span>
                </div>

                <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-[#151B2E] text-slate-500 dark:text-slate-400 transition-colors"
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen desk-clock'}
                    title={isFullscreen ? 'Exit fullscreen' : 'Desk-Clock Fullscreen'}
                >
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
            </div>

            {/* Center Dial & Giant Digits - isolated in MobileTimerDisplay */}
            <div className="my-auto flex flex-col items-center justify-center">
                <MobileTimerDisplay
                    endsAt={endsAt}
                    isActive={isActive}
                    pausedTimeLeft={pausedTimeLeft}
                    dialSize={dialSize}
                    isLandscape={isLandscape}
                    phaseTotalSeconds={totalPhaseSecs}
                    onExpire={handleTimeUp}
                />
            </div>

            {/* Bottom Controls */}
            <div className={`w-full max-w-sm flex items-center justify-center gap-4 ${isLandscape ? 'pb-1' : 'pb-6'}`}>
                {/* Pause / Resume Button */}
                <button
                    onClick={togglePauseResume}
                    className={`flex items-center justify-center gap-2 rounded-full font-semibold transition-all active:scale-95 shadow-md ${
                        isLandscape
                            ? 'h-[36px] min-w-[96px] px-5 text-[13px]'
                            : 'h-12 min-w-[130px] px-7 text-sm'
                    } ${
                        isActive
                            ? 'bg-slate-200 dark:bg-[#151B2E] hover:bg-slate-300 dark:hover:bg-[#1E2742] text-slate-800 dark:text-white'
                            : 'bg-[#2B6BFF] hover:bg-blue-600 text-white'
                    }`}
                >
                    {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isActive ? t('focus.pause') : t('focus.resume')}</span>
                </button>

                {/* End / Reset Session Button */}
                <button
                    onClick={handleEndSession}
                    className={`flex items-center justify-center gap-2 rounded-full font-semibold transition-all active:scale-95 bg-white dark:bg-[#151B2E] hover:bg-slate-100 dark:hover:bg-[#1E2742] border border-slate-200 dark:border-[#222A41] text-slate-700 dark:text-slate-300 ${
                        isLandscape
                            ? 'h-[36px] min-w-[88px] px-4 text-[13px]'
                            : 'h-12 min-w-[110px] px-6 text-sm'
                    }`}
                >
                    <RotateCcw className="w-4 h-4" />
                    <span>End</span>
                </button>
            </div>
        </div>
    )
}

export default function PomodoroTimerWrapper() {
    const { t } = useTranslation()
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0B1021] flex items-center justify-center text-white">{t('focus.loadingTimer')}</div>}>
            <TimerContent />
        </Suspense>
    )
}
