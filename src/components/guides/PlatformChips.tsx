import React from 'react';
import { Gem, Monitor, Smartphone } from 'lucide-react';
import type { Availability } from './guideUtils';

const base =
  'inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[12px] font-medium leading-none whitespace-nowrap';

export function PlatformChips({ a }: { a: Availability }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {a.web && a.phone && (
        <>
          <span className={`${base} border border-line bg-surface-2 text-ink-2`}>
            <Monitor size={12} aria-hidden />
            Web
          </span>
          <span className={`${base} border border-line bg-surface-2 text-ink-2`}>
            <Smartphone size={12} aria-hidden />
            Phone app
          </span>
        </>
      )}
      {!a.web && a.phone && (
        <span className={`${base} bg-warning/12 text-[color-mix(in_srgb,var(--warning)_70%,var(--ink))]`}>
          <Smartphone size={12} aria-hidden />
          Phone app only
        </span>
      )}
      {a.pro && (
        <span className={`${base} bg-primary-soft text-primary-text`}>
          <Gem size={12} aria-hidden />
          Pro
        </span>
      )}
    </span>
  );
}

export default PlatformChips;
