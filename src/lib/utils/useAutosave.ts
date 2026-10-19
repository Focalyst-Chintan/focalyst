'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { emitDataChanged } from '@/lib/events';

export function useAutosave(save: () => Promise<void>, delay = 1200) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    clearTimeout(timer.current);
    clearTimeout(retryTimer.current);
    setStatus('saving');
    try {
      await saveRef.current();
      setStatus('saved');
      emitDataChanged('note');
    } catch (e) {
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
    return () => {
      window.removeEventListener('beforeunload', onHide);
      clearTimeout(retryTimer.current);
      void flush();
    };
  }, [flush]);

  return { status, schedule, flush };
}
