import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getCoalescedSession } from '../src/utils/supabase';
import { useUser } from '../src/utils/UserContext';
import { clearWidgetsOnSignOut } from '../src/services/widgetSync';
import { hasPendingVoiceNoteIntent, setPendingVoiceNoteIntent } from '../src/services/voiceNoteIntent';

export default function Index() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string; action?: string }>();
  const [loading, setLoading] = useState(true);
  const { profile: userContextProfile } = useUser();

  useEffect(() => {
    if (!hasPendingVoiceNoteIntent()) {
      if (params?.action === 'start' || params?.action === 'record-voice') {
        setPendingVoiceNoteIntent('start', `index:${params.action}`);
      } else if (params?.action === 'open') {
        setPendingVoiceNoteIntent('open', 'index:open');
      }
    }
  }, [params?.action]);

  const isVoiceDeepLink =
    params?.action === 'record-voice' ||
    params?.action === 'start' ||
    params?.action === 'open';
  const targetDestination = isVoiceDeepLink
    ? '/(tabs)/notes'
    : params?.view === 'countdown'
    ? '/(tabs)/focus?section=countdown'
    : params?.view
    ? `/(tabs)/plan?view=${params.view}`
    : '/(tabs)/plan';

  useEffect(() => {
    let redirected = false;

    // Hard fail-safe: Never hang on the initial splash spinner longer than 9s
    const fallbackTimer = setTimeout(async () => {
      if (!redirected) {
        redirected = true;
        // Check for cached boot user before giving up
        try {
          const rawBoot = await AsyncStorage.getItem('@focalyst_boot_user_v1');
          if (rawBoot) {
            const parsed = JSON.parse(rawBoot);
            if (parsed?.user?.id) {
              setLoading(false);
              router.replace(targetDestination as any);
              return;
            }
          }
        } catch {}
        setLoading(false);
        router.replace('/auth' as any);
      }
    }, 9000);

    async function checkAuth() {
      try {
        // 1. Fast check: Check if we have a cached boot user in AsyncStorage
        let cachedBootUser: any = null;
        let cachedBootProfile: any = null;
        try {
          const rawBoot = await AsyncStorage.getItem('@focalyst_boot_user_v1');
          if (rawBoot) {
            const parsed = JSON.parse(rawBoot);
            if (parsed?.user?.id) {
              cachedBootUser = parsed.user;
              cachedBootProfile = parsed.profile;
            }
          }
        } catch (bootErr) {
          console.warn('[Index] Boot user check warning:', bootErr);
        }

        // 2. Race getSession with an 8000ms timeout for slow Android networks / token refreshes
        const sessionPromise = getCoalescedSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: null }), 8000)
        );

        const result = await Promise.race([sessionPromise, timeoutPromise]);
        const session = result?.data?.session;

        if (!session) await clearWidgetsOnSignOut();

        if (redirected) return;

        let activeUser = session?.user ?? null;
        // getSession is the local persisted source of truth. Network validation via getUser
        // can fail during resume or token refresh and must not discard a valid local session.

        if (activeUser) {
          redirected = true;
          clearTimeout(fallbackTimer);
          setLoading(false);

          // Non-blocking onboarding check with timeout
          try {
            let onboardingDone: boolean | undefined = undefined;
            if (userContextProfile?.id === activeUser.id && typeof userContextProfile.onboarding_done === 'boolean') {
              onboardingDone = userContextProfile.onboarding_done;
            } else if (cachedBootProfile?.id === activeUser.id && typeof cachedBootProfile.onboarding_done === 'boolean') {
              onboardingDone = cachedBootProfile.onboarding_done;
            } else {
              const profilePromise = supabase
                .from('users')
                .select('onboarding_done')
                .eq('id', activeUser.id)
                .maybeSingle();

              const profileTimeout = new Promise<{ data: { onboarding_done: boolean } | null }>((resolve) =>
                setTimeout(() => resolve({ data: { onboarding_done: true } }), 2000)
              );

              const { data: profile } = await Promise.race([profilePromise, profileTimeout]);
              onboardingDone = profile?.onboarding_done;
            }

            if (onboardingDone === false) {
              router.replace({ pathname: '/onboarding', params: { signedIn: '1' } } as any);
            } else {
              router.replace(targetDestination as any);
            }
          } catch {
            router.replace(targetDestination as any);
          }
        } else {
          redirected = true;
          clearTimeout(fallbackTimer);
          setLoading(false);
          router.replace('/onboarding' as any);
        }
      } catch (e) {
        console.warn('[Index] Auth verification error:', e);
        if (!redirected) {
          redirected = true;
          clearTimeout(fallbackTimer);
          // Last-chance check for cached boot user
          try {
            const rawBoot = await AsyncStorage.getItem('@focalyst_boot_user_v1');
            if (rawBoot) {
              const parsed = JSON.parse(rawBoot);
              if (parsed?.user?.id) {
                setLoading(false);
                router.replace(targetDestination as any);
                return;
              }
            }
          } catch {}
          setLoading(false);
          router.replace('/onboarding' as any);
        }
      }
    }

    checkAuth();

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#090d16', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return null;
}
