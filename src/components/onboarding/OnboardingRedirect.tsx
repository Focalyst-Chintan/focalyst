'use client';
// The old /onboarding pages (WEB_ONBOARDING_DESIGN.md 2.2): /start when not onboarded, else the normal home.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

function homePath() {
  // Desktop /today; phones keep their current home.
  return window.matchMedia('(min-width: 1024px)').matches ? '/today' : '/plan';
}

export function OnboardingRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const uid = user?.id ?? null;

  useEffect(() => {
    if (isLoading) return;
    if (!uid) {
      router.replace('/start');
      return;
    }
    let live = true;
    (async () => {
      const { data } = await createClient().from('users').select('onboarding_done').eq('id', uid).maybeSingle();
      if (live) router.replace(data?.onboarding_done ? homePath() : '/start');
    })();
    return () => { live = false; };
  }, [isLoading, uid, router]);

  return <div className="min-h-dvh bg-canvas" aria-busy="true" />;
}

export default OnboardingRedirect;
