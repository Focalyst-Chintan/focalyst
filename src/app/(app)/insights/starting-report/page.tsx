'use client';
// /insights/starting-report (WEB_ONBOARDING_REPORT.md R7): the same report as screen 28, from the user's own row.
import { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasPro } from '@/lib/billing/proStatus';
import { isNativeApp } from '@/lib/billing/checkout';
import { Skeleton } from '@/components/desktop/ui/Skeleton';
import { StartingReport } from '@/components/onboarding/StartingReport';
import { buildPlan } from '@/lib/onboarding/plan';
import { buildStartingReport } from '@/lib/onboarding/startingReport';
import { useStartingReportRow } from '@/lib/onboarding/useStartingReportRow';

const noSubscribe = () => () => {};

function BackLink() {
  return (
    <Link
      href="/insights"
      className="inline-flex items-center gap-1.5 self-start rounded-[8px] text-[14px] font-medium text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Insights
    </Link>
  );
}

export default function StartingReportPage() {
  const router = useRouter();
  const { plan } = useAuth();
  const { row, isLoading } = useStartingReportRow();
  const native = useSyncExternalStore(noSubscribe, isNativeApp, () => false);
  const pro = hasPro({ plan });

  const built = useMemo(() => {
    if (!row) return null;
    return {
      report: buildStartingReport({
        answers: row.answers,
        report: row.report,
        isPro: pro,
        today: new Date(),
        locale: typeof navigator !== 'undefined' ? navigator.language : undefined,
        builtOn: row.completed_at ? new Date(row.completed_at) : undefined,
      }),
      plan: buildPlan(row.answers, pro),
    };
  }, [row, pro]);

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 pb-28 pt-6 font-ui text-ink lg:px-6 lg:pb-16 lg:pt-8">
      {isLoading ? (
        <div className="flex flex-col gap-4">
          <BackLink />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-40 w-full rounded-[20px]" />
          <Skeleton className="h-40 w-full rounded-[20px]" />
        </div>
      ) : built && row ? (
        <StartingReport
          report={built.report}
          mode={native ? 'free-only' : pro ? 'full' : 'locked'}
          answers={row.answers}
          plan={built.plan}
          onUnlock={() => router.push('/paywall')}
          before={<BackLink />}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <BackLink />
          <div className="frost rounded-[20px] p-6">
            <h1 className="text-[17px] font-semibold text-ink">No starting report yet</h1>
            <p className="mt-1.5 text-[14px] leading-[22px] text-ink-2">
              It&apos;s built from the answers you give when you first set up your plan in Focalyst.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
