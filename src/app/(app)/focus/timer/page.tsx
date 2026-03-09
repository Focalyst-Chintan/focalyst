'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function TimerContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const supabase = createClient()

    const focusMins = parseInt(searchParams.get('focus') || '25')
    const breakMins = parseInt(searchParams.get('break') || '5')
    const totalSets = parseInt(searchParams.get('sets') || '4')

    const [mode, setMode] = useState<'FOCUS' | 'BREAK' | 'DONE'>('FOCUS')
    const [timeLeft, setTimeLeft] = useState(focusMins * 60)
    const [currentSet, setCurrentSet] = useState(1)
    const [isActive, setIsActive] = useState(true)
    const wakeLock = useRef<WakeLockSentinel | null>(null)

    // WakeLock API
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
            if (wakeLock.current) {
                wakeLock.current.release()
            }
        }
    }, [])

    const endTimeRef = useRef<number | null>(null)

    useEffect(() => {
        if (isActive && mode !== 'DONE') {
            endTimeRef.current = Date.now() + (timeLeft * 1000)
        } else {
            endTimeRef.current = null
        }
    }, [isActive, mode]) // Re-run when play/pause is toggled

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isActive && mode !== 'DONE') {
            interval = setInterval(() => {
                if (endTimeRef.current) {
                    const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
                    setTimeLeft(remaining)
                    if (remaining === 0) {
                        handleTimeUp()
                    }
                }
            }, 500)
        }
        return () => clearInterval(interval)
    }, [isActive, mode])

    const handleTimeUp = () => {
        if (mode === 'FOCUS') {
            if (currentSet < totalSets) {
                setMode('BREAK')
                setTimeLeft(breakMins * 60)
            } else {
                finishSession()
            }
        } else if (mode === 'BREAK') {
            setMode('FOCUS')
            setCurrentSet((s) => s + 1)
            setTimeLeft(focusMins * 60)
        }
    }

    const finishSession = async () => {
        setMode('DONE')
        setIsActive(false)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
            await supabase.from('pomodoro_sessions').insert([{
                user_id: session.user.id,
                focus_minutes: focusMins,
                break_minutes: breakMins,
                sets_planned: totalSets,
                sets_completed: currentSet,
                started_at: new Date(Date.now() - (currentSet * focusMins * 60000)).toISOString(),
                was_completed: true
            }])
        }
    }

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60)
        const s = secs % 60
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    // Distraction free - hides main UI
    useEffect(() => {
        document.body.classList.add('distraction-free')
        return () => document.body.classList.remove('distraction-free')
    }, [])

    if (mode === 'DONE') {
        return (
            <div className="min-h-screen bg-card-bg flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-4xl font-bold text-navy mb-8">Great job</h1>
                <p className="text-xl text-navy mb-12">
                    You focused for {focusMins * currentSet} minutes across {currentSet} sets
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            setMode('FOCUS')
                            setCurrentSet(1)
                            setTimeLeft(focusMins * 60)
                            setIsActive(true)
                        }}
                        className="bg-navy text-white px-6 py-3 rounded-xl font-medium"
                    >
                        Start new
                    </button>
                    <button
                        onClick={() => router.push('/focus')}
                        className="bg-accent text-white px-6 py-3 rounded-xl font-medium"
                    >
                        Back
                    </button>
                </div>
            </div>
        )
    }

    if (mode === 'BREAK') {
        return (
            <div className="min-h-screen bg-card-bg flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-4xl font-bold text-navy mb-4">Well done</h1>
                <p className="text-xl text-navy mb-12">Set {currentSet} of {totalSets} complete<br />Next session begins in</p>

                <div className="text-[100px] font-bold text-white mb-16 tracking-tight">
                    {formatTime(timeLeft)}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleTimeUp}
                        className="bg-navy text-white px-8 py-3 rounded-xl font-medium"
                    >
                        Skip
                    </button>
                    <button
                        onClick={() => router.push('/focus')}
                        className="bg-accent text-white px-8 py-3 rounded-xl font-medium"
                    >
                        Back
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-navy text-white px-6 py-2 rounded-full text-sm font-semibold mb-4 uppercase tracking-wide">
                Focus Time
            </div>
            <div className="text-xl font-medium text-navy mb-16">
                Set {currentSet}/{totalSets}
            </div>

            <div className="text-[100px] font-bold text-[#1F1F1F] mb-8 tracking-tight font-mono">
                {formatTime(timeLeft)}
            </div>

            {/* Progress bar */}
            <div className="w-64 h-4 bg-card-bg rounded-full overflow-hidden mb-24 mx-auto">
                <div
                    className="h-full bg-accent transition-all duration-1000 linear"
                    style={{ width: `${((focusMins * 60 - timeLeft) / (focusMins * 60)) * 100}%` }}
                />
            </div>

            <div className="flex gap-4">
                <button
                    onClick={() => setIsActive(!isActive)}
                    className="bg-navy text-white px-8 py-3 rounded-xl font-medium"
                >
                    {isActive ? 'Pause' : 'Resume'}
                </button>
                <button
                    onClick={() => router.push('/focus')}
                    className="bg-card-bg text-navy px-8 py-3 rounded-xl font-medium"
                >
                    Reset
                </button>
            </div>
        </div>
    )
}

export default function PomodoroTimer() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-navy">Loading timer...</div>}>
            <TimerContent />
        </Suspense>
    )
}
