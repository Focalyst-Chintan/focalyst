'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { isPaidPlan } from '@/lib/featureGates';
import { emitDataChanged } from '@/lib/events';
import { Check, Loader2 } from 'lucide-react';

function SuccessContent() {
  const [status, setStatus] = useState<'checking' | 'done' | 'slow'>('checking');
  const [elapsed, setElapsed] = useState(0);
  const supabase = createClient();

  function isPro(data: { plan?: string | null; plan_expires_at?: string | null }) {
    return isPaidPlan(data.plan, data.plan_expires_at);
  }

  useEffect(() => {
    let stopped = false;
    const started = Date.now();

    const intervalTimer = setInterval(() => {
      if (stopped) return;
      setElapsed(Date.now() - started);
    }, 500);

    const tick = async () => {
      if (stopped) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('users').select('plan, plan_expires_at').eq('id', user.id).maybeSingle();
      if (data && isPro(data)) { setStatus('done'); emitDataChanged('profile'); return; }
      if (Date.now() - started > 40000) { setStatus('slow'); return; }
      setTimeout(tick, 2000);
    };
    tick();

    return () => {
      stopped = true;
      clearInterval(intervalTimer);
    };
  }, []);

  const progressFraction = Math.min(1, elapsed / 40000);

  return (
    <main className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6 font-ui">
      <div className="w-full max-w-[440px] rounded-[24px] glass-strong p-8 sm:p-10 flex flex-col items-center text-center shadow-[var(--shadow-glass)]">
        {status === 'checking' && (
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line-strong)" strokeWidth="6" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#1951FC"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - progressFraction)}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            </div>
            <h1 className="text-[22px] font-semibold text-ink">Confirming your payment</h1>
            <p className="mt-2 text-[14px] text-ink-2">
              Just a moment while we set up your account.
            </p>
          </div>
        )}

        {status === 'done' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
              <Check className="w-8 h-8" strokeWidth={3} />
            </div>
            <h1 className="text-[24px] font-semibold text-ink">Welcome to Focalyst Pro</h1>
            <p className="mt-2 text-[14px] text-ink-2">
              Your Pro membership is now active. All limits unlocked.
            </p>
            <Link
              href="/today"
              className="mt-8 inline-flex h-12 px-8 items-center justify-center rounded-[14px] bg-primary hover:bg-primary-hover text-snow font-medium text-[15px] transition-all shadow-[var(--shadow-1)] cursor-pointer active:scale-[0.98]"
            >
              Start using Pro
            </Link>
          </div>
        )}

        {status === 'slow' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6">
              <Check className="w-8 h-8" strokeWidth={2.5} />
            </div>
            <h1 className="text-[22px] font-semibold text-ink">Payment received</h1>
            <p className="mt-3 text-[14px] text-ink-2 leading-relaxed">
              Your payment went through. Pro can take a minute to appear. Refresh this page, or email contactfocalyst@gmail.com if it does not show up within 10 minutes.
            </p>
            <div className="mt-8 flex gap-3 w-full">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 h-11 rounded-[14px] border border-line-strong text-ink hover:bg-surface-2 text-[14px] font-medium transition-all cursor-pointer"
              >
                Refresh page
              </button>
              <Link
                href="/today"
                className="flex-1 h-11 inline-flex items-center justify-center rounded-[14px] bg-primary hover:bg-primary-hover text-snow text-[14px] font-medium transition-all cursor-pointer"
              >
                Go to app
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-line border-t-primary animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
