'use client'

import { useState, useEffect, useRef } from 'react'

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

interface VoiceRecordingOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onRecordingComplete: (transcript: string, durationSeconds: number) => void;
}

export const VoiceRecordingOverlay = ({ isOpen, onClose, onRecordingComplete }: VoiceRecordingOverlayProps) => {
    const [isRecording, setIsRecording] = useState(false)
    const [duration, setDuration] = useState(0)
    const [transcript, setTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Use an array to store all finalized transcripts because interim results can overwrite
    const finalTranscriptsRef = useRef<string[]>([])

    const recognitionRef = useRef<any>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!isOpen) return;

        // Reset state on open
        setIsRecording(false)
        setDuration(0)
        setTranscript('')
        setError(null)
        finalTranscriptsRef.current = []

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError("Voice recording is not supported in this browser. Please try Chrome or Edge.")
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsRecording(true);
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1)
            }, 1000)
        }

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscriptsRef.current.push(event.results[i][0].transcript);
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            // Display finalized + interim to user
            setTranscript(finalTranscriptsRef.current.join(' ') + ' ' + interimTranscript)
        }

        recognition.onerror = (event: any) => {
            if (event.error === 'not-allowed') {
                setError("Microphone access denied. Please allow microphone access to record voice notes.")
            } else if (event.error !== 'no-speech') {
                console.error("Speech recognition error:", event.error)
            }
        }

        recognition.onend = () => {
            // Because continuous=true, it shouldn't end unless stopped, but it might on silence
            // We can restart or just treat as stopped. Let's restart if still supposedly recording.
            // Simplified: Native API sometimes stops automatically, we handle manual stop below.
        }

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (e: any) {
            setError(e.message || "Failed to start recording.")
        }

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    }, [isOpen]);

    const handleStop = () => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setIsRecording(false);
        // Clean trailing spaces
        const finalContent = transcript.trim();
        if (finalContent.length > 0) {
            onRecordingComplete(finalContent, duration);
        } else {
            onClose(); // Just close if nothing recorded
        }
    }

    if (!isOpen) return null;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    return (
        <div className="fixed inset-0 z-[100] bg-navy/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 sm:p-8 animate-in fade-in duration-200">
            {/* Header / Timer */}
            <div className="absolute top-16 w-full flex flex-col items-center gap-2">
                {!error && (
                    <div className="flex items-center justify-center gap-3 bg-white/10 px-6 py-3 rounded-full backdrop-blur-md">
                        <div className={`w-3 h-3 rounded-full bg-red-500 ${isRecording ? 'animate-pulse' : ''}`} />
                        <span className="text-white text-xl font-medium tracking-wider">{formatTime(duration)}</span>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error ? (
                <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl max-w-sm text-center">
                    <p className="text-white mb-6 text-[15px]">{error}</p>
                    <button
                        onClick={onClose}
                        className="bg-white text-navy px-8 py-3 rounded-full font-semibold outline-none hover:bg-white/90 transition-colors"
                    >
                        Close
                    </button>
                </div>
            ) : (
                <>
                    {/* Live Transcript Display */}
                    <div className="flex-1 w-full max-w-xl mx-auto flex flex-col justify-center items-center my-24 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                        <p className="text-white/80 text-xl sm:text-2xl font-light text-center leading-relaxed">
                            {transcript || (isRecording ? "Listening..." : "Preparing...")}
                        </p>
                    </div>

                    {/* Microphone Pulse Animation */}
                    <div className="absolute bottom-32">
                        <div className="relative flex items-center justify-center">
                            {isRecording && (
                                <>
                                    <div className="absolute w-32 h-32 bg-accent/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                                    <div className="absolute w-24 h-24 bg-accent/40 rounded-full animate-pulse" />
                                </>
                            )}
                            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center z-10 shadow-lg">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C10.3431 2 9 3.34315 9 5V11C9 12.6569 10.3431 14 12 14C13.6569 14 15 12.6569 15 11V5C15 3.34315 13.6569 2 12 2Z" fill="white" />
                                    <path d="M19 10V11C19 14.866 15.866 18 12 18C8.13401 18 5 14.866 5 11V10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M12 18V22" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-8 w-full flex justify-center gap-6 px-6 pb-safe">
                        <button
                            onClick={onClose}
                            className="bg-white/10 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/20 transition-colors backdrop-blur-md"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleStop}
                            disabled={!isRecording || duration === 0}
                            className="bg-white text-navy px-12 py-4 rounded-full font-semibold disabled:opacity-50 transition-colors hover:bg-white/90"
                        >
                            Stop & Save
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
