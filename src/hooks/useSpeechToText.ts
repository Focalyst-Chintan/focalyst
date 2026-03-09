import { useState, useEffect, useCallback, useRef } from 'react';

// Interfaces for Web Speech API since they might not be fully typed in all TS setups
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onerror: ((this: SpeechRecognition, ev: any) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

export function useSpeechToText(onTranscript: (transcript: string) => void) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [recognitionObj, setRecognitionObj] = useState<SpeechRecognition | null>(null);

    const onTranscriptRef = useRef(onTranscript);

    useEffect(() => {
        onTranscriptRef.current = onTranscript;
    }, [onTranscript]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition() as SpeechRecognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                onTranscriptRef.current(finalTranscript + ' '); // Add a space after the transcript
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        setRecognitionObj(recognition);
    }, []);

    const toggleListening = useCallback(() => {
        if (!isSupported || !recognitionObj) return;

        if (isListening) {
            recognitionObj.stop();
            setIsListening(false);
        } else {
            try {
                recognitionObj.start();
                setIsListening(true);
            } catch (e) {
                console.error("Could not start recognition:", e);
            }
        }
    }, [isListening, isSupported, recognitionObj]);

    // Ensure it stops on unmount
    useEffect(() => {
        return () => {
            if (isListening && recognitionObj) {
                recognitionObj.stop();
            }
        };
    }, [isListening, recognitionObj]);


    return {
        isListening,
        isSupported,
        toggleListening
    };
}
