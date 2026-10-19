'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

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
                ? 'Microphone access denied. Go to Settings → Focalyst → Microphone and enable it.'
                : `Could not access microphone: ${err?.message || err}`
            setError(msg)
            setPermissionState('denied')
            console.error('[VoiceRecorder] getUserMedia error:', err)
            return
        }

        // MediaRecorder — record the raw audio blob for potential upload
        try {
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/mp4')
                    ? 'audio/mp4'
                    : ''
            const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
            mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
            mr.start(250)  // collect chunks every 250ms
            mediaRecorderRef.current = mr
        } catch (e) {
            console.warn('[VoiceRecorder] MediaRecorder unavailable:', e)
        }

        // Web Audio waveform
        startWaveform(stream)

        // Speech recognition transcript
        startRecognition()

        // Timer
        setIsRecording(true)
        timerRef.current = setInterval(() => {
            setDuration(prev => prev + 1)
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
    const handleStop = useCallback(() => {
        const finalText = transcriptRef.current.trim()
        const finalDuration = duration
        stopAll()

        if (finalText.length > 0) {
            onRecordingComplete(finalText, finalDuration)
        } else {
            onClose()
        }
    }, [duration, stopAll, onRecordingComplete, onClose])

    // ─── Discard ─────────────────────────────────────────────────────────────
    const handleDiscard = useCallback(() => {
        stopAll()
        onClose()
    }, [stopAll, onClose])

    if (!isOpen) return null

    // ─── Bar heights: map 0–1 amplitude → pixel height range 6–80 ───────────
    const minH = 6
    const maxH = 80

    return (
        <div
            className="fixed inset-0 h-screen z-[100] flex flex-col bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-800"
            style={{ touchAction: 'manipulation' }}
        >
            {/* ── HEADER ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 pt-safe-top pb-3 pt-12 border-b border-slate-100 dark:border-slate-700/50">
                {/* Back arrow */}
                <button
                    onClick={handleDiscard}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Go back"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        style={{ width: '22px', height: '22px', display: 'block' }}>
                        <path d="M15 18L9 12L15 6" stroke="#E53E3E" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {/* Center: recording dot + title */}
                <div className="flex items-center gap-2">
                    <div
                        className={`w-2.5 h-2.5 rounded-full bg-red-500 ${isRecording && !isPaused ? 'animate-pulse' : 'opacity-40'}`}
                        style={{ flexShrink: 0 }}
                    />
                    <span className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                        {isPaused ? 'Paused' : 'Recording Voice Note'}
                    </span>
                </div>

                {/* Settings gear */}
                <button
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Settings"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        className="text-slate-500 dark:text-slate-400"
                        style={{ width: '20px', height: '20px', display: 'block' }}>
                        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                    </svg>
                </button>
            </div>

            {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto pb-32 flex flex-col items-center justify-center px-6 gap-10">

                {/* Error state */}
                {error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-6 rounded-2xl max-w-sm text-center w-full">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                            className="mx-auto mb-3 text-red-500"
                            style={{ width: '36px', height: '36px', display: 'block' }}>
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
                            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                        <p className="text-red-700 dark:text-red-300 text-[14px] font-medium mb-5 leading-relaxed">{error}</p>
                        <button
                            onClick={onClose}
                            className="bg-red-600 text-white px-8 py-2.5 rounded-full font-semibold text-[14px] hover:bg-red-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ── TIMER ─────────────────────────────────────────── */}
                        <div className="flex flex-col items-center gap-1.5">
                            <span className="text-[56px] font-bold leading-none tracking-tight text-slate-900 dark:text-white tabular-nums">
                                {formatTime(duration)}
                            </span>
                            <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-400 dark:text-slate-400">
                                {isPaused ? 'PAUSED' : 'Active Capture'}
                            </span>
                        </div>

                        {/* ── WAVEFORM VISUALIZER ────────────────────────────── */}
                        <div
                            className="flex items-center justify-center gap-[3px] w-full max-w-[280px]"
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
                                                ? 'bg-navy dark:bg-slate-300'
                                                : isPaused
                                                    ? 'bg-slate-300 dark:bg-slate-600'
                                                    : 'bg-slate-200 dark:bg-slate-700'
                                        }`}
                                        style={{
                                            width: '5px',
                                            height: `${Math.round(shapedH)}px`,
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
                            <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">
                                Interview Recording
                            </p>
                            <p className="text-[13px] text-slate-500 dark:text-slate-400">
                                {permissionState === 'pending'
                                    ? 'Requesting microphone...'
                                    : isPaused
                                        ? 'Recording paused'
                                        : 'High Accuracy Status'}
                            </p>
                        </div>

                        {/* ── LIVE TRANSCRIPT (subtle, scrollable) ──────────── */}
                        {transcript.length > 0 && (
                            <div
                                className="w-full max-w-sm max-h-[80px] overflow-y-auto text-center"
                                style={{ scrollbarWidth: 'none' }}
                            >
                                <p className="text-[13px] text-slate-400 dark:text-slate-500 leading-relaxed italic">
                                    {transcript}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── FOOTER CONTROLS ────────────────────────────────────────────── */}
            {!error && (
                <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-slate-900 pb-8 pt-4 flex justify-center items-center gap-8 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">

                    {/* Left: Discard */}
                    <button
                        onClick={handleDiscard}
                        className="flex flex-col items-center gap-1.5 group"
                        aria-label="Discard recording"
                    >
                        <div className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            {/* Trash icon */}
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                                className="text-slate-500 dark:text-slate-400 group-hover:text-red-500 transition-colors"
                                style={{ width: '22px', height: '22px', display: 'block' }}>
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                        </div>
                        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400 group-hover:text-red-500 transition-colors">
                            Discard
                        </span>
                    </button>

                    {/* Center: Stop button */}
                    <button
                        onClick={handleStop}
                        disabled={!isRecording && duration === 0}
                        className="flex flex-col items-center gap-1.5 disabled:opacity-40"
                        aria-label="Stop recording"
                    >
                        <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-xl shadow-red-600/30 active:scale-95 transition-transform">
                            {/* Square stop icon */}
                            <div
                                className="bg-white rounded-[4px]"
                                style={{ width: '26px', height: '26px' }}
                            />
                        </div>
                    </button>

                    {/* Right: Pause */}
                    <button
                        onClick={handlePause}
                        disabled={!isRecording}
                        className="flex flex-col items-center gap-1.5 group disabled:opacity-40"
                        aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
                    >
                        <div className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            {isPaused ? (
                                // Play icon when paused
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"
                                    className="text-slate-600 dark:text-slate-300 ml-0.5"
                                    style={{ width: '18px', height: '18px', display: 'block' }}>
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                            ) : (
                                // Pause bars icon
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                                    className="text-slate-600 dark:text-slate-300"
                                    style={{ width: '18px', height: '18px', display: 'block' }}>
                                    <line x1="8" y1="5" x2="8" y2="19" />
                                    <line x1="16" y1="5" x2="16" y2="19" />
                                </svg>
                            )}
                        </div>
                        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                            {isPaused ? 'Resume' : 'Pause'}
                        </span>
                    </button>
                </div>
            )}
        </div>
    )
}
