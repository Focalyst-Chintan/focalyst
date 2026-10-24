'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase';
import { emitDataChanged } from '@/lib/events';
import AmbientBackground from '@/components/desktop/AmbientBackground';
import PricingSection from '@/components/PricingSection';
import { useRestorePurchase } from '@/lib/billing/useRestorePurchase';

const SUBLINE = 'Plan your days, focus deeply and see how you are growing, with everything Focalyst can do.';

export function DesktopPaywall({ mode }: { mode: 'paywall' | 'onboarding' }) {
  const router = useRouter();
  const { plan, user } = useAuth();
  const supabase = createClient();

  const handleOnboardingFree = async () => {
    try {
      if (user?.id) {
        await supabase
          .from('users')
          .update({
            plan: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Failed to set free plan:', err);
    }
    router.push('/onboarding/name');
  };

  const handleClose = () => {
    if (mode === 'onboarding') {
      handleOnboardingFree();
    } else {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push('/today');
      }
    }
  };

  const handleFree = () => {
    if (mode === 'onboarding') {
      handleOnboardingFree();
    } else {
      handleClose();
    }
  };

  const { restore, isRestoring: restoring } = useRestorePurchase({
    onSuccess: () => {
      emitDataChanged('profile');
      router.push('/today');
    },
  });

  return (
    <div
      className="dark relative min-h-dvh overflow-hidden bg-[var(--canvas)] text-[var(--ink)]"
      data-theme="dark"
      style={{ colorScheme: 'dark' }}
    >
      <AmbientBackground />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.32em] text-ink select-none">
          <Image
            src="/small-logo.png"
            alt="Focalyst"
            width={24}
            height={24}
            className="h-6 w-6 rounded-[6px]"
          />
          <span>FOCALYST</span>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={handleClose}
          className="grid size-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-2)] transition hover:text-[var(--ink)] cursor-pointer"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ink-3)]">
            Focalyst Pro
          </p>
          <h1 className="mt-3 font-display text-5xl leading-tight text-[var(--ink)]">
            Unlock your full{' '}
            <span className="bg-[linear-gradient(90deg,#3781FC,#CBE9FD)] bg-clip-text text-transparent">
              productivity.
            </span>
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--ink-2)]">{SUBLINE}</p>
        </div>
        <div className="mt-12">
          <PricingSection mode={mode} onFree={handleFree} currentPlan={plan} />
        </div>
        <p className="mt-8 text-center">
          <button
            type="button"
            onClick={restore}
            disabled={restoring}
            className="text-sm text-[var(--ink-3)] underline-offset-4 hover:text-[var(--ink)] hover:underline cursor-pointer disabled:opacity-60"
          >
            {restoring ? 'Checking your purchase' : 'Already paid? Restore purchase'}
          </button>
        </p>
      </main>
    </div>
  );
}
export default DesktopPaywall;
