'use client';
// /get-app (WEB_ONBOARDING_DESIGN.md 2.1): iOS goes to the App Store, Android to Google Play, anything else sees both.
import { useEffect } from 'react';
import AmbientBackground from '@/components/desktop/AmbientBackground';
import {
  APP_STORE_URL, PLAY_STORE_URL, StoreButtons, usePlatform,
} from '@/components/onboarding/StoreButtons';

export default function GetApp() {
  const platform = usePlatform();
  const target = platform === 'ios' ? APP_STORE_URL : platform === 'android' ? PLAY_STORE_URL : '';

  useEffect(() => {
    if (target) window.location.replace(target);
  }, [target]);

  const any = Boolean(APP_STORE_URL || PLAY_STORE_URL);

  return (
    <main className="relative flex min-h-dvh items-center justify-center p-5 font-ui text-ink">
      <AmbientBackground />
      <div className="glass-strong liquid relative z-10 w-full max-w-[440px] rounded-[24px] p-8 text-center">
        <p className="text-[13px] font-semibold tracking-[0.32em] text-ink">FOCALYST</p>
        <h1 className="mt-6 font-display text-[32px] leading-[38px] text-ink">Get the phone app</h1>
        {platform === null || target ? (
          <p className="mt-3 text-[14px] text-ink-2" role="status">Opening the store…</p>
        ) : any ? (
          <>
            <p className="mt-3 text-[14px] leading-[22px] text-ink-2">Log in with the same account to see your plan.</p>
            <StoreButtons platform="other" className="mt-6 justify-center" />
          </>
        ) : (
          <p className="mt-3 text-[14px] leading-[22px] text-ink-2">The phone app isn&apos;t available yet. Your plan is ready on focalyst.online.</p>
        )}
      </div>
    </main>
  );
}
