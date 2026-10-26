'use client';
import { useCallback, useEffect, useRef } from 'react';

export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  const fnRef = useRef(fn);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<A | null>(null);
  useEffect(() => { fnRef.current = fn; }, [fn]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current) { const a = pending.current; pending.current = null; fnRef.current(...a); }
  }, []);

  const run = useCallback((...args: A) => {
    pending.current = args;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, ms);
  }, [ms, flush]);

  useEffect(() => flush, [flush]); // save on unmount
  return { run, flush };
}
