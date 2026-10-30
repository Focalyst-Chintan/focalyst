import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/utils/supabase';

export default function Index() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string }>();
  const [loading, setLoading] = useState(true);
  const targetDestination = params?.view === 'countdown'
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
        router.replace('/onboarding' as any);
      }
    }, 9000);

    async function checkAuth() {
      try {
        // 1. Fast check: Check if we have a cached boot user in AsyncStorage
        let cachedBootUser: any = null;
        try {
          const rawBoot = await AsyncStorage.getItem('@focalyst_boot_user_v1');
          if (rawBoot) {
            const parsed = JSON.parse(rawBoot);
            if (parsed?.user?.id) {
              cachedBootUser = parsed.user;
            }
          }
        } catch (bootErr) {
          console.warn('[Index] Boot user check warning:', bootErr);
        }

        // 2. Race getSession with an 8000ms timeout for slow Android networks / token refreshes
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: null }), 8000)
        );

        const result = await Promise.race([sessionPromise, timeoutPromise]);
        const session = result?.data?.session;

        if (redirected) return;

        // If active session exists OR if getSession timed out/failed but we have a valid cached boot user
        const activeUser = session?.user || cachedBootUser;

        if (activeUser) {
          redirected = true;
          clearTimeout(fallbackTimer);
          setLoading(false);

          // Non-blocking onboarding check with timeout
          try {
            const profilePromise = supabase
              .from('users')
              .select('onboarding_done')
              .eq('id', activeUser.id)
              .maybeSingle();

            const profileTimeout = new Promise<{ data: { onboarding_done: boolean } | null }>((resolve) =>
              setTimeout(() => resolve({ data: { onboarding_done: true } }), 2000)
            );

            const { data: profile } = await Promise.race([profilePromise, profileTimeout]);
            if (profile?.onboarding_done === false) {
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
