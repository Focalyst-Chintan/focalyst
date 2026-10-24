import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, LogBox } from 'react-native';


import '../global.css';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useNotifications } from '../src/hooks/useNotifications';

// Non-crashing environment variable validation (logs warning instead of fatal throw)
const requiredEnvs = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
const missingEnvs = requiredEnvs.filter((env) => !process.env[env]);
if (missingEnvs.length > 0) {
  console.warn(`[Startup Shield] Note: Missing environment variables: ${missingEnvs.join(', ')}.`);
}

// Suppress internal Supabase async refresh errors
LogBox.ignoreLogs(['AuthApiError: Invalid Refresh Token']);

// Initialize i18n (side-effect import — must be at root)
import '../src/lib/i18n';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/components/useColorScheme';
import { UserProvider } from '../src/utils/UserContext';
import XpPopup from '../components/XpPopup';
import * as Linking from 'expo-linking';
import { supabase } from '../src/utils/supabase';
import { initOutageResilience } from '../src/services/outageResilienceService';
import { OutageStatusBanner } from '../components/OutageStatusBanner';
import { AppReviewModal } from '../components/AppReviewModal';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [bootTimeoutReached, setBootTimeoutReached] = useState(false);

  // Register push token & permissions via the notifications hook.
  // The hook handles: permission request, ExpoPushToken fetch, Supabase upsert,
  // and timezone detection — all in a single mount-once effect.
  const { expoPushToken } = useNotifications();

  // Safety boot timer: Never block rendering longer than 2.8s
  useEffect(() => {
    const bootTimer = setTimeout(() => {
      setBootTimeoutReached(true);
    }, 2800);
    return () => clearTimeout(bootTimer);
  }, []);

  // Intercept Google/Apple OAuth Redirects (Deep Linking)
  useEffect(() => {
    const handleIncomingUrl = async (event: Linking.EventType) => {
      if (!event.url) return;
      try {
        const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('OAuth deep link resolution timeout')), 4000)
        );

        const extractPromise = (async () => {
          const urlStr = event.url;
          // Parse code from search params or hash params
          const getParam = (name: string) => {
            const regex = new RegExp('[?&#]' + name + '=([^&#]*)');
            const results = regex.exec(urlStr);
            return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : null;
          };

          const code = getParam('code');
          if (code) {
            return await supabase.auth.exchangeCodeForSession(code);
          }

          const accessToken = getParam('access_token');
          const refreshToken = getParam('refresh_token');
          if (accessToken && refreshToken) {
            return await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }

          return await (supabase.auth as any).getSessionFromUrl(urlStr);
        })();

        const { data } = await Promise.race([extractPromise, timeoutPromise]);
        if (data?.session) {
          // Successfully authenticated via OAuth deep link
        }
      } catch (oauthErr) {
        console.warn('[RootLayout] OAuth deep link resolution error:', oauthErr);
      }
    };

    // Check if app was opened directly from a deep link state
    Linking.getInitialURL().then((url) => {
      if (url) handleIncomingUrl({ url });
    });

    // Actively listen for incoming background redirect links
    const linkSubscription = Linking.addEventListener('url', handleIncomingUrl);
    return () => linkSubscription.remove();
  }, []);

  // Initialize Outage Resilience Service (local cache snapshots, 30s auto-check & remote banner)
  useEffect(() => {
    initOutageResilience(supabase);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <UserProvider>
            <OutageStatusBanner />
            <AppReviewModal />
            <XpPopup />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="profile" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal', headerShown: false }} />
              <Stack.Screen name="onboarding/name" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="onboarding/profile-type" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
          </UserProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
