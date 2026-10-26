'use client';
import useSWR, { useSWRConfig, type SWRConfiguration } from 'swr';
import { useEffect } from 'react';
import type { DataKind } from '@/lib/events';

const defaults: SWRConfiguration = {
  keepPreviousData: true,
  revalidateOnFocus: true,
  dedupingInterval: 4000,
  errorRetryCount: 2,
};

// Keys look like 'habits:<userId>' or 'tasks:<userId>:2026-10-20'
export function useData<T>(key: string | null, fetcher: () => Promise<T>, opts?: SWRConfiguration<T>) {
  return useSWR<T>(key, fetcher, { ...defaults, ...opts });
}

// Map event kinds to SWR key prefixes
const kindToPrefixes: Record<string, string[]> = {
  task: ['tasks:'],
  habit: ['habits:', 'accountability:'],
  reminder: ['reminders:'],
  countdown: ['countdowns:'],
  focus: ['focus:'],
  note: ['notes:', 'folders:'],
  notes: ['notes:', 'folders:'],
  user: ['profile:'],
  profile: ['profile:'],
};

// Mount once in (app)/layout. Turns existing emitDataChanged('habits') calls into cache refreshes.
export function DataEventsBridge() {
  const { mutate } = useSWRConfig();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = (e: Event) => {
      const kind = (e as CustomEvent).detail?.kind as DataKind | undefined;
      if (!kind) return;
      const prefixes = kindToPrefixes[kind] || [`${kind}:`];
      mutate((k) => typeof k === 'string' && prefixes.some((prefix) => k.startsWith(prefix)));
    };
    window.addEventListener('fx:data-changed', h);
    return () => window.removeEventListener('fx:data-changed', h);
  }, [mutate]);
  return null;
}
