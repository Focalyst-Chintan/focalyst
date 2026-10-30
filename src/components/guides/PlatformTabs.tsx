'use client';

import React, { useSyncExternalStore } from 'react';
import { SegmentedControl } from '@/components/desktop/ui/SegmentedControl';

type Tab = 'web' | 'phone';
const KEY = 'guides:platform';

// The choice is remembered in localStorage (wrapped in try/catch), with an
// in-memory fallback when storage is blocked. With no choice yet, phones start
// on "On your phone" and larger screens on "On the web".
let memory: Tab | null = null;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

function getSnapshot(): Tab {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'web' || saved === 'phone') return saved;
  } catch {}
  if (memory) return memory;
  return window.matchMedia('(min-width: 768px)').matches ? 'web' : 'phone';
}

function choose(t: Tab) {
  memory = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {}
  listeners.forEach((l) => l());
}

// Both panels are always rendered; the hidden one is hidden with CSS through
// data-state, so search engines see both. From 1100 px up both show side by
// side and the tabs are hidden. Before hydration (first paint), CSS shows the
// phone panel on phones and the web panel on larger screens.
export function PlatformTabs({ web, phone }: { web: React.ReactNode; phone: React.ReactNode }) {
  const tab = useSyncExternalStore<Tab | null>(subscribe, getSnapshot, () => null);

  const state = (t: Tab) => (tab === null ? 'auto' : tab === t ? 'active' : 'inactive');
  const panel =
    'min-w-0 data-[state=inactive]:hidden min-[1100px]:data-[state=inactive]:block min-[1100px]:!block';

  return (
    <div className="flex flex-col gap-4">
      <div className="min-[1100px]:hidden">
        <SegmentedControl
          value={tab ?? 'web'}
          onChange={choose}
          options={[
            { value: 'web', label: 'On the web' },
            { value: 'phone', label: 'On your phone' },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 min-[1100px]:grid-cols-2">
        <div
          data-state={state('web')}
          className={`${panel} data-[state=auto]:hidden md:data-[state=auto]:block`}
        >
          {web}
        </div>
        <div data-state={state('phone')} className={`${panel} md:data-[state=auto]:hidden`}>
          {phone}
        </div>
      </div>
    </div>
  );
}

export default PlatformTabs;
