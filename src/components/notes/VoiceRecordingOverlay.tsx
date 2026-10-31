'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { pickMime, extFor } from '@/lib/audio/useRecorder'

// ─── iOS/WebKit global type augmentations ──────────────────────────────────────
declare global {
    interface Window {
        SpeechRecognition: any
        webkitSpeechRecognition: any
    }
}

// ─── Number of waveform bars ───────────────────────────────────────────────────
const BAR_COUNT = 28

// ─── Props ─────────────────────────────────────────────────────────────────────
interface VoiceRecordingOverlayProps {
    isOpen: boolean
    onClose: () => void
    onRecordingComplete: (transcript: string, durationSeconds: number) => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ─── Component ─────────────────────────────────────────────────────────────────
export const VoiceRecordingOverlay = ({
    isOpen,
    onClose,
    onRecordingComplete,
}: VoiceRecordingOverlayProps) => {

    // ── Recording state ─────────────────────────────────────────────────────
    const [isRecording, setIsRecording] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [duration, setDuration] = useState(0)
    const [transcript, setTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied'>('pending')

    // ── Waveform bars (0–1 amplitudes) ──────────────────────────────────────
    const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(0.15))

    // ── Refs ────────────────────────────────────────────────────────────────
    const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
    const animFrameRef     = useRef<number | null>(null)
    const streamRef        = useRef<MediaStream | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioCtxRef      = useRef<AudioContext | null>(null)
    const analyserRef      = useRef<AnalyserNode | null>(null)
    const chunksRef        = useRef<Blob[]>([])
    const recognitionRef   = useRef<any>(null)
    const finalTxRef       = useRef<string[]>([])
    // Capture latest transcript in a ref so handleStop can read it synchronously
    const transcriptRef    = useRef('')
    const handleStopRef    = useRef<() => void>(() => {})

    // Keep transcriptRef in sync with state
    useEffect(() => { transcriptRef.current = transcript }, [transcript])

    // ─── Waveform animation loop (Web Audio AnalyserNode) ──────────────────
    const startWaveform = useCallback((stream: MediaStream) => {
        try {
            // AudioContext must be created after a user gesture on iOS WebKit
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            audioCtxRef.current = ctx

            const analyser = ctx.createAnalyser()
            analyser.fftSize = 64  // small FFT = 32 frequency bins, fast update
            analyserRef.current = analyser

            ctx.createMediaStreamSource(stream).connect(analyser)

            const dataArray = new Uint8Array(analyser.frequencyBinCount)

            const tick = () => {
                analyser.getByteFrequencyData(dataArray)
                // Map analyser bins → BAR_COUNT bars, normalize 0→1
                const step = Math.floor(dataArray.length / BAR_COUNT)
                const next = Array.from({ length: BAR_COUNT }, (_, i) => {
                    const raw = dataArray[i * step] / 255
                    // Add a small idle baseline so bars are always visible
                    return Math.max(0.08, raw)
                })
                setBars(next)
                animFrameRef.current = requestAnimationFrame(tick)
            }
            animFrameRef.current = requestAnimationFrame(tick)
        } catch (e) {
            console.warn('[VoiceRecorder] Web Audio API unavailable, using idle bars:', e)
        }
    }, [])

    const stopWaveform = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current)
            animFrameRef.current = null
        }
        if (audioCtxRef.current) {
            try { audioCtxRef.current.close() } catch (_) {}
            audioCtxRef.current = null
        }
        analyserRef.current = null
        setBars(Array(BAR_COUNT).fill(0.08))
    }, [])

    // ─── Speech recognition setup ───────────────────────────────────────────
    const startRecognition = useCallback(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SR) return

        const recognition = new SR()
        recognition.continuous    = true
        recognition.interimResults = true
        recognition.lang           = 'en-US'

        recognition.onresult = (event: any) => {
            let interim = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTxRef.current.push(event.results[i][0].transcript)
                } else {
                    interim += event.results[i][0].transcript
                }
            }
            const combined = finalTxRef.current.join(' ') + (interim ? ' ' + interim : '')
            setTranscript(combined.trim())
        }

        recognition.onerror = (event: any) => {
            // 'no-speech' is benign — continuous mode fires this on silence
            if (event.error !== 'no-speech') {
                console.warn('[VoiceRecorder] Speech recognition error:', event.error)
            }
        }

        // Re-start on unexpected end (iOS WebKit stops recognition on silence)
        recognition.onend = () => {
            if (isRecording && !isPaused) {
                try { recognition.start() } catch (_) {}
            }
        }

        try { recognition.start() } catch (e) {
            console.warn('[VoiceRecorder] Could not start speech recognition:', e)
        }

        recognitionRef.current = recognition
    }, [isRecording, isPaused])

    const stopRecognition = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.onend = null; recognitionRef.current.stop() } catch (_) {}
            recognitionRef.current = null
        }
    }, [])

    // ─── Main start/stop logic ──────────────────────────────────────────────
    const startRecording = useCallback(async () => {
        setError(null)
        setPermissionState('pending')
        finalTxRef.current = []
        chunksRef.current  = []
        setTranscript('')
        setDuration(0)
        setIsPaused(false)

        let stream: MediaStream
        try {
            // Capacitor/WebKit: getUserMedia triggers the native iOS permission dialog
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                },
            })
            streamRef.current = stream
            setPermissionState('granted')
        } catch (err: any) {
            const msg = err?.name === 'NotAllowedError'
                ? 'Allow microphone access in your browser settings to record.'
                : 'Could not process that recording. Please try again.'
            setError(msg)
            setPermissionState('denied')
            console.error('[VoiceRecorder] getUserMedia error:', err)
            return
        }

        // MediaRecorder with preferred mime and 32kbps audio
        try {
            const mime = pickMime()
            const mr = new MediaRecorder(
                stream,
                mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 }
            )
            mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
            mr.start(1000)
            mediaRecorderRef.current = mr
        } catch (e) {
            console.warn('[VoiceRecorder] MediaRecorder unavailable:', e)
        }

        // Web Audio waveform
        startWaveform(stream)

        // Speech recognition transcript
        startRecognition()

        // Timer capped at 10 minutes (600s)
        setIsRecording(true)
        timerRef.current = setInterval(() => {
            setDuration(prev => {
                const next = prev + 1
                if (next >= 600) {
                    handleStopRef.current()
                    return 600
                }
                return next
            })
        }, 1000)
    }, [startWaveform, startRecognition])

    const stopAll = useCallback(() => {
        // Timer
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        // Speech recognition
        stopRecognition()
        // Waveform
        stopWaveform()
        // MediaRecorder
        if (mediaRecorderRef.current) {
            try { mediaRecorderRef.current.stop() } catch (_) {}
            mediaRecorderRef.current = null
        }
        // Media stream tracks
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setIsRecording(false)
        setIsPaused(false)
    }, [stopRecognition, stopWaveform])

    // ─── Mount: request permission and start on open ────────────────────────
    useEffect(() => {
        if (!isOpen) return

        // Small timeout lets the overlay render before triggering the native
        // iOS permission dialog (prevents WKWebView permission denial edge case)
        const t = setTimeout(() => { startRecording() }, 200)

        return () => {
            clearTimeout(t)
            stopAll()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    // ─── Pause / Resume ─────────────────────────────────────────────────────
    const handlePause = useCallback(() => {
        if (!isRecording) return

        if (!isPaused) {
            // ── Pause ──
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
            if (mediaRecorderRef.current?.state === 'recording') {
                try { mediaRecorderRef.current.pause() } catch (_) {}
            }
            stopRecognition()
            // Freeze waveform at idle
            if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
            setBars(Array(BAR_COUNT).fill(0.08))
            setIsPaused(true)
        } else {
            // ── Resume ──
            timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000)
            if (mediaRecorderRef.current?.state === 'paused') {
                try { mediaRecorderRef.current.resume() } catch (_) {}
            }
            // Re-start waveform animation on existing stream
            if (streamRef.current) startWaveform(streamRef.current)
            startRecognition()
            setIsPaused(false)
        }
    }, [isRecording, isPaused, stopRecognition, startWaveform, startRecognition])

    // ─── Stop & finalize ────────────────────────────────────────────────────
    const handleStop = useCallback(async () => {
        const finalDuration = duration
        stopAll()

        let finalText = transcriptRef.current.trim()
        if (!finalText && chunksRef.current.length > 0) {
            const mime = pickMime()
            const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || mime || 'audio/webm' })
            chunksRef.current = []

            if (blob.size < 2000) {
                setError('That was too short. Hold the mic a little longer.')
                return
            }

            if (blob.size > 4_000_000) {
                setError('That recording is too long. Keep it under 10 minutes.')
                return
            }

            try {
                const formData = new FormData()
                formData.append('file', blob, `recording.${extFor(blob.type)}`)

                const res = await fetch('/api/ai/transcribe', {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin',
                })
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}))
                    console.error('[recorder]', res.status, data.code)
                    setError(data.error || 'Could not process that recording. Please try again.')
                    return
                }
                const data = await res.json()
                finalText = data.text || ''
            } catch (e) {
                console.error('[recorder] network error', e)
                setError('Could not reach Focalyst. Check your connection and try again.')
                return
            }
        }

        if (finalText.length > 0) {
            onRecordingComplete(finalText, finalDuration)
        } else {
            onClose()
        }
    }, [duration, stopAll, onRecordingComplete, onClose])

    useEffect(() => {
        handleStopRef.current = handleStop
    }, [handleStop])

    // ─── Discard ─────────────────────────────────────────────────────────────
    const handleDiscard = useCallback(() => {
        stopAll()
        onClose()
    }, [stopAll, onClose])

    if (!isOpen) return null

    // ─── Bar heights: map 0–1 amplitude → pixel height range 6–80 ───────────
    const minH = 6
    const maxH = 80

    const live = isRecording && !isPaused

    return (
        <div
            className="fixed inset-0 h-[100dvh] z-[100] flex flex-col bg-canvas text-ink"
            style={{ touchAction: 'manipulation' }}
            role="dialog"
            aria-modal="true"
            aria-label="Voice note"
        >
            <div aria-hidden className="m-ambient !z-0 !absolute" />

            {/* ── HEADER ─────────────────────────────────────────────────── */}
            <div className="relative flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-2">
                {/* Back arrow */}
                <button
                    onClick={handleDiscard}
                    className="m-icon-btn m-press"
                    aria-label="Go back"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        style={{ width: '20px', height: '20px', display: 'block' }}>
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1.75"
                            strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {/* Center: recording pill */}
                <span className="m-glass !rounded-full inline-flex items-center gap-2 h-8 px-3.5 m-subhead text-ink">
                    <span
                        aria-hidden
                        className={`w-2 h-2 rounded-full bg-[var(--m-danger)] ${live ? 'animate-pulse [animation-duration:1s]' : 'opacity-40'}`}
                    />
                    {isPaused ? 'Paused' : 'Now recording'}
                </span>

                {/* Settings gear */}
                <button
                    className="m-icon-btn m-press"
                    aria-label="Settings"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                        style={{ width: '20px', height: '20px', display: 'block' }}>
                        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                    </svg>
                </button>
            </div>

            {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
            <div className="relative flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-40 flex flex-col gap-3">

                {/* Error state */}
                {error ? (
                    <div role="alert" className="m-glass p-6 text-center w-full my-auto">
                        <span className="m-tile mx-auto mb-4 !w-12 !h-12 !bg-[color-mix(in_srgb,var(--m-danger)_14%,transparent)] !border-[color-mix(in_srgb,var(--m-danger)_40%,transparent)] text-[var(--m-danger-text)]">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                style={{ width: '24px', height: '24px', display: 'block' }}>
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
                                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                        </span>
                        <p className="m-body text-ink mb-5">{error}</p>
                        <button
                            onClick={onClose}
                            className="m-btn m-btn-secondary m-press"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Same order as before: timer, waveform, status, live transcript */}
                        <div className="m-hero p-6 flex flex-col items-center text-center gap-6 my-auto">
                            {/* ── TIMER ─────────────────────────────────────────── */}
                            <div className="flex flex-col items-center gap-1">
                                <span className="m-stat-xl text-ink">
                                    {formatTime(duration)}
                                </span>
                                <span className="m-overline text-ink-2">
                                    {isPaused ? 'Paused' : 'Recording'}
                                </span>
                            </div>

                            {/* ── WAVEFORM VISUALIZER ────────────────────────────── */}
                            <div
                                className={`flex items-center justify-center gap-[3px] w-full max-w-[280px] ${live ? 'dark:drop-shadow-[0_0_10px_rgba(55,129,252,0.55)]' : ''}`}
                                aria-hidden="true"
                                style={{ height: `${maxH + 8}px` }}
                            >
                                {bars.map((amp, i) => {
                                    const h = minH + amp * (maxH - minH)
                                    // Center bars are taller (bell curve shape multiplier)
                                    const center = BAR_COUNT / 2
                                    const distFromCenter = Math.abs(i - center) / center
                                    const shapedH = Math.max(minH, h * (1 - distFromCenter * 0.35))
                                    const isActive = isRecording && !isPaused

                                    return (
                                        <div
                                            key={i}
                                            className={`rounded-full flex-shrink-0 transition-all ${
                                                isActive
                                                    ? ''
                                                    : 'bg-[var(--line-strong)]'
                                            }`}
                                            style={{
                                                width: '5px',
                                                height: `${Math.round(shapedH)}px`,
                                                ...(isActive ? { background: `color-mix(in srgb, #3781FC ${100 - Math.round((i / BAR_COUNT) * 70)}%, #CBE9FD)` } : {}),
                                                // Stagger the CSS animation delay for idle wave effect
                                                animationDelay: `${(i * 40) % 400}ms`,
                                                ...(isActive && amp < 0.2 ? { animation: 'voiceBarIdle 1.2s ease-in-out infinite alternate' } : {}),
                                            }}
                                        />
                                    )
                                })}
                            </div>

                            {/* ── STATUS TEXT ───────────────────────────────────── */}
                            <div className="flex flex-col items-center gap-1 text-center">
                                <p className="m-title-3 text-ink">
                                    Voice note
                                </p>
                                <p className="m-footnote text-ink-2">
                                    {permissionState === 'pending'
                                        ? 'Asking for the microphone'
                                        : isPaused
                                            ? 'Recording paused'
                                            : 'Recording in high quality'}
                                </p>
                            </div>

                            {/* ── LIVE TRANSCRIPT (subtle, scrollable) ──────────── */}
                            {transcript.length > 0 && (
                                <div
                                    className="w-full max-h-[96px] overflow-y-auto text-center"
                                    style={{ scrollbarWidth: 'none' }}
                                >
                                    <p className="m-footnote text-ink-2">
                                        {transcript}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ── FOOTER CONTROLS ────────────────────────────────────────────── */}
            {!error && (
                <div className="absolute bottom-0 left-0 w-full pt-6 pb-[calc(env(safe-area-inset-bottom)+20px)] flex justify-center items-end gap-10 z-10 bg-[linear-gradient(180deg,transparent,var(--canvas)_35%)]">

                    {/* Left: Discard */}
                    <button
                        onClick={handleDiscard}
                        className="m-press flex flex-col items-center gap-1.5"
                        aria-label="Discard recording"
                    >
                        <span className="w-12 h-12 flex items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--m-danger)_14%,transparent)] text-[var(--m-danger-text)]">
                            {/* Trash icon */}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                                style={{ width: '20px', height: '20px', display: 'block' }}>
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                        </span>
                        <span className="m-caption text-ink-2">
                            Discard
                        </span>
                    </button>

                    {/* Center: Stop button */}
                    <button
                        onClick={handleStop}
                        disabled={!isRecording && duration === 0}
                        className="m-press flex flex-col items-center gap-1.5 disabled:opacity-40"
                        aria-label="Stop recording"
                    >
                        <span className="w-[72px] h-[72px] bg-[var(--m-danger)] rounded-full flex items-center justify-center shadow-[0_6px_20px_rgba(240,68,56,0.45)]">
                            {/* Square stop icon */}
                            <span
                                className="bg-snow rounded-[4px]"
                                style={{ width: '24px', height: '24px' }}
                            />
                        </span>
                        <span className="m-caption text-ink-2">Stop</span>
                    </button>

                    {/* Right: Pause */}
                    <button
                        onClick={handlePause}
                        disabled={!isRecording}
                        className="m-press flex flex-col items-center gap-1.5 disabled:opacity-40"
                        aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
                    >
                        <span className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--m-surface-strong)] border border-line-strong text-ink">
                            {isPaused ? (
                                // Play icon when paused
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"
                                    className="ml-0.5"
                                    style={{ width: '18px', height: '18px', display: 'block' }}>
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                            ) : (
                                // Pause bars icon
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                                    style={{ width: '18px', height: '18px', display: 'block' }}>
                                    <line x1="8" y1="5" x2="8" y2="19" />
                                    <line x1="16" y1="5" x2="16" y2="19" />
                                </svg>
                            )}
                        </span>
                        <span className="m-caption text-ink-2">
                            {isPaused ? 'Resume' : 'Pause'}
                        </span>
                    </button>
                </div>
            )}
        </div>
    )
}
