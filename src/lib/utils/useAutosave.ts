'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { emitDataChanged } from '@/lib/events';

export type AutosaveStatus = 'idle' | 'saving' | 'still-working' | 'saved' | 'error';

export function useAutosave(save: () => Promise<void>, delay = 800) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    clearTimeout(timer.current);
    clearTimeout(retryTimer.current);
    clearTimeout(slowTimer.current);
    setStatus('saving');

    slowTimer.current = setTimeout(() => {
      setStatus((s) => (s === 'saving' ? 'still-working' : s));
    }, 8000);

    try {
      await saveRef.current();
      clearTimeout(slowTimer.current);
      setStatus('saved');
      emitDataChanged('note');
    } catch (e) {
      clearTimeout(slowTimer.current);
      console.error(e);
      dirty.current = true;
      setStatus('error');
      retryTimer.current = setTimeout(() => {
        void flush();
      }, 3000);
    }
  }, []);

  const schedule = useCallback(() => {
    dirty.current = true;
    setStatus('idle');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush();
    }, delay);
  }, [flush, delay]);

  useEffect(() => {
    const onHide = () => {
      void flush();
    };
    window.addEventListener('beforeunload', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      window.removeEventListener('pagehide', onHide);
      clearTimeout(retryTimer.current);
      clearTimeout(slowTimer.current);
      void flush();
    };
  }, [flush]);

  return { status, schedule, flush };
}
