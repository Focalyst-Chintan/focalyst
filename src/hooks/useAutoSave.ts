import { useEffect, useRef, useState, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave<T>(
    saveFunction: (data: T) => Promise<void>,
    dataToSave: T,
    delay: number = 30000 // default 30 seconds
) {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const dataRef = useRef(dataToSave);
    const isFirstRender = useRef(true);

    // Keep dataRef updated without triggering re-renders or effect loops
    useEffect(() => {
        dataRef.current = dataToSave;
    }, [dataToSave]);

    const performSave = useCallback(async (data: T) => {
        setStatus('saving');
        try {
            await saveFunction(data);
            setStatus('saved');
            setTimeout(() => {
                setStatus((current) => current === 'saved' ? 'idle' : current);
            }, 2000);
        } catch (error) {
            console.error('Failed to auto-save:', error);
            setStatus('error');
        }
    }, [saveFunction]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            performSave(dataRef.current);
        }, delay);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [dataToSave, delay, performSave]);

    // Save on unmount or beforeunload
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Prevent default behavior to allow a synchronous save if possible, 
            // though asynchronous saves might not complete reliably in beforeunload.
            // Using navigator.sendBeacon is preferred for guaranteed delivery, 
            // but for complex updates, we'll try the async function and hope for the best.
            performSave(dataRef.current);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Save on unmount
            performSave(dataRef.current);
        };
    }, [performSave]);

    // Manual triggers
    const triggerSave = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        performSave(dataRef.current);
    }, [performSave]);

    const retrySave = useCallback(() => {
        if (status === 'error') {
            triggerSave();
        }
    }, [status, triggerSave]);


    return { status, triggerSave, retrySave };
}
