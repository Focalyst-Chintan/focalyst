import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useUser } from '../utils/UserContext';
import { supabase } from '../utils/supabase';
import { clearDraft, loadDraft, loadPostState } from './draft';
import { isReportPaywallOpen } from './paywallIntent';
import { hasPendingFinish } from './finish';

/**
 * App-level auth rule (IOS_ONBOARDING_DESIGN.md section 8.1), mounted once in the root layout.
 *
 * When a session appears and an onboarding draft exists:
 * - onboarding_done is true: delete the draft and carry on as today.
 * - onboarding_done is false: a draft that reached "Save my plan" goes to /onboarding/finish;
 *   an earlier one resumes the flow (screen 4 at the earliest).
 *
 * Once the plan is saved, screens 28 to 32 wait in onboarding:post:v1: any route outside
 * onboarding goes back to them, except the paywall opened from the report.
 *
 * The sign-in screen routes itself after signing in, so this runs again whenever the route
 * changes outside onboarding. Whichever navigation lands last, the user ends up here.
 */
export function OnboardingAuthRouter() {
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const userId = user?.id as string | undefined;

  useEffect(() => {
    // "/" is the entry route, which already routes signed-in users (app/index.tsx).
    if (!userId || pathname === '/' || pathname.startsWith('/onboarding')) return;
    let cancelled = false;
    (async () => {
      const draft = await loadDraft();
      if (cancelled) return;
      if (!draft) {
        // Just saved: the report (screens 28 to 32) is waiting. The sign-in screen routes itself
        // after signing up, sometimes after the save already finished, so bring the user back.
        // The paywall opened from "Unlock my full report" is the one place they may go.
        const post = await loadPostState();
        if (cancelled || !post) return;
        if (pathname === '/paywall' && isReportPaywallOpen()) return;
        router.replace({ pathname: '/onboarding', params: { signedIn: '1' } } as any);
        return;
      }
      // A save that already failed moved on to the report; the next app open retries it.
      if (await hasPendingFinish()) return;
      const { data, error } = await supabase.from('users').select('onboarding_done').eq('id', userId).maybeSingle();
      if (cancelled || error) return;
      if (data?.onboarding_done) {
        await clearDraft();
        return;
      }
      if (draft.step >= 27) router.replace('/onboarding/finish' as any);
      else router.replace({ pathname: '/onboarding', params: { signedIn: '1' } } as any);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, userId]);

  return null;
}
