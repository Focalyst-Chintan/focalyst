'use client';
// "Your starting report" card on Insights (WEB_ONBOARDING_REPORT.md R7): at the top for the first 30 days, then at the end.
import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { FileText, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasPro } from '@/lib/billing/proStatus';
import { isNativeApp } from '@/lib/billing/checkout';
import { useStartingReportRow } from '@/lib/onboarding/useStartingReportRow';

const TOP_DAYS = 30;
const noSubscribe = () => () => {};

export function StartingReportCard({ position, className = '' }: { position: 'top' | 'end'; className?: string }) {
  const { plan } = useAuth();
  const { row } = useStartingReportRow();
  const native = useSyncExternalStore(noSubscribe, isNativeApp, () => false);
  const now = useSyncExternalStore(noSubscribe, () => Math.floor(Date.now() / 3600000), () => null);
  if (!row?.completed_at || now === null) return null;

  const completed = Date.parse(row.completed_at);
  if (Number.isNaN(completed)) return null;
  const recent = now * 3600000 - completed < TOP_DAYS * 86400000;
  if ((position === 'top') !== recent) return null;
  const locked = !hasPro({ plan }) && !native;

  return (
    <section className={`frost flex items-center gap-4 rounded-[20px] p-5 ${className}`} aria-label="Your starting report">
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary-soft text-primary-text">
        <FileText className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          Your starting report
          {locked && (
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-ink-3" aria-hidden />
              <span className="inline-flex h-[18px] items-center rounded-full bg-primary-soft px-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-primary-text">
                Pro
              </span>
            </span>
          )}
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-2">Where you started, and your plan from here.</p>
      </div>
      <Link
        href="/insights/starting-report"
        className="inline-flex h-9 shrink-0 items-center rounded-[10px] border border-line-strong bg-surface px-4 text-[14px] font-medium text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
      >
        Read
      </Link>
    </section>
  );
}

export default StartingReportCard;
