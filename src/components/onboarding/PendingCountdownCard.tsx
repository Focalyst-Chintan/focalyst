'use client';
// The pending-countdown card where countdowns live on the web (WEB_ONBOARDING_DESIGN.md 8.6).
import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Hourglass } from 'lucide-react';
import { Button } from '@/components/desktop/ui/Button';
import { isNativeApp } from '@/lib/billing/checkout';
import {
  PENDING_COUNTDOWN_EVENT, parsePendingCountdown, readPendingCountdownRaw, writePendingCountdown,
} from '@/lib/onboarding/draft';
import { daysUntil, formatNumber } from './copy';

function subscribe(onChange: () => void) {
  window.addEventListener(PENDING_COUNTDOWN_EVENT, onChange);
  return () => window.removeEventListener(PENDING_COUNTDOWN_EVENT, onChange);
}

const noSubscribe = () => () => {};

export function PendingCountdownCard({ className = '' }: { className?: string }) {
  const raw = useSyncExternalStore(subscribe, readPendingCountdownRaw, () => null);
  const native = useSyncExternalStore(noSubscribe, isNativeApp, () => false);
  const c = parsePendingCountdown(raw);

  if (!c || c.status !== 'needs_pro' || c.dismissed) return null;
  const days = daysUntil(c.date);
  if (days === null || days < 0) return null;

  return (
    <div className={`frost flex flex-col gap-3 rounded-[16px] p-4 sm:flex-row sm:items-center ${className}`}>
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary-text">
        <Hourglass className="h-4 w-4" />
      </span>
      <p className="min-w-0 flex-1 text-[14px] leading-[20px] text-ink">
        {c.name} is {formatNumber(days, 0)} {days === 1 ? 'day' : 'days'} away. Countdowns beyond 90 days are part of Pro.
      </p>
      <div className="flex shrink-0 gap-2">
        {!native && (
          <Link
            href="/paywall"
            className="inline-flex h-8 items-center rounded-[10px] bg-primary px-3 text-[13px] font-medium text-snow hover:bg-primary-hover"
          >
            See Pro
          </Link>
        )}
        <Button size="sm" variant="ghost" onClick={() => writePendingCountdown({ ...c, dismissed: true })}>
          Remove
        </Button>
      </div>
    </div>
  );
}

export default PendingCountdownCard;
