'use client';

import React, { useEffect, useState } from 'react';
import { SegmentedControl } from '@/components/desktop/ui/SegmentedControl';

type Tab = 'web' | 'phone';
const KEY = 'guides:platform';

// Both panels are always rendered; the hidden one is hidden with CSS through
// data-state, so search engines see both. From 1100 px up both show side by
// side and the tabs are hidden. Before the choice is known (first paint), CSS
// shows the phone panel on phones and the web panel on larger screens.
export function PlatformTabs({ web, phone }: { web: React.ReactNode; phone: React.ReactNode }) {
  const [tab, setTab] = useState<Tab | null>(null);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    if (saved === 'web' || saved === 'phone') setTab(saved);
    else setTab(window.matchMedia('(min-width: 768px)').matches ? 'web' : 'phone');
  }, []);

  const choose = (t: Tab) => {
    setTab(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {}
  };

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
