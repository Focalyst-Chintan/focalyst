import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { queryCache } from './queryCache';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  plan: string;
  isPro: boolean;
  ai_message_count: number;
  last_message_date: string | null;
  onboarding_done: boolean;
  total_xp: number;
  current_level: number;
  current_title: string;
}

interface UserContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
  signOut: () => Promise<void>;
}

const BOOT_USER_KEY = '@focalyst_boot_user_v1';

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const userRef = React.useRef<any>(user);
  React.useEffect(() => {
    userRef.current = user;
  }, [user]);

  const profileRef = React.useRef<UserProfile | null>(profile);
  React.useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const isFetchingProfileRef = React.useRef<string | null>(null);

  // Helper to persist boot snapshot
  const persistBootSnapshot = React.useCallback(async (u: any, p: UserProfile | null) => {
    if (!u) return;
    try {
      await AsyncStorage.setItem(
        BOOT_USER_KEY,
        JSON.stringify({ user: u, profile: p, savedAt: Date.now() })
      );
    } catch (e) {
      console.warn('[UserContext] Failed to persist boot snapshot:', e);
    }
  }, []);

  const clearBootSnapshot = React.useCallback(async () => {
    try {
      await AsyncStorage.removeItem(BOOT_USER_KEY);
    } catch {}
  }, []);

  const fetchUserProfile = React.useCallback(async (userId: string, currentUser?: any): Promise<UserProfile | null> => {
    if (!userId || isFetchingProfileRef.current === userId) return null;
    isFetchingProfileRef.current = userId;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, plan, ai_message_count, last_message_date, onboarding_done, total_xp, current_level, current_title')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();

      if (!error && data) {
        const rawPlan = data.plan || 'free';
        const uProfile: UserProfile = {
          id: data.id,
          email: data.email || '',
          full_name: data.full_name,
          plan: rawPlan,
          isPro: rawPlan !== 'free',
          ai_message_count: data.ai_message_count || 0,
          last_message_date: data.last_message_date || null,
          onboarding_done: data.onboarding_done || false,
          total_xp: data.total_xp || 0,
          current_level: data.current_level || 1,
          current_title: data.current_title || 'Ignition',
        };
        setProfile(uProfile);
        // Silently update boot snapshot
        const activeUser = currentUser || userRef.current;
        if (activeUser) {
          void persistBootSnapshot(activeUser, uProfile);
        }
        return uProfile;
      }
    } catch (err) {
      console.warn('[UserContext] Background profile fetch timed out or failed:', err);
    } finally {
      clearTimeout(timeoutId);
      isFetchingProfileRef.current = null;
    }
    return null;
  }, [persistBootSnapshot]);

  const refreshProfile = React.useCallback(async (): Promise<UserProfile | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user;
      if (sessionUser) {
        return await fetchUserProfile(sessionUser.id, sessionUser);
      }
    } catch (e) {
      console.warn('[UserContext] refreshProfile error:', e);
    }
    return null;
  }, [fetchUserProfile]);

  useEffect(() => {
    let isMounted = true;

    // Hard fail-safe: Never allow the loading spinner to hang longer than 2.5 seconds
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2500);

    async function initAuth() {
      let hasCachedSession = false;

      // 1. Instant On-Device Auth Trust: Check disk snapshot first (<10ms)
      try {
        const rawBoot = await AsyncStorage.getItem(BOOT_USER_KEY);
        if (rawBoot && isMounted) {
          const parsed = JSON.parse(rawBoot);
          if (parsed?.user?.id) {
            hasCachedSession = true;
            setUser(parsed.user);
            if (parsed.profile) {
              setProfile(parsed.profile);
            }
            setLoading(false);
            clearTimeout(safetyTimer);
            // Hydrate disk snapshots for this user immediately
            await queryCache.hydrateUserSnapshots(parsed.user.id);
          }
        }
      } catch (e) {
        console.warn('[UserContext] Boot snapshot hydration warning:', e);
      }

      // 2. Background verification with Supabase
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null }; error: any }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null }, error: null }), 2500)
          ),
        ]);

        if (!isMounted) return;
        const currentSession = sessionResult?.data?.session ?? null;
        const sessionError = sessionResult?.error;

        // If refresh token explicitly revoked/invalid, sign out
        if (sessionError && (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid Refresh Token'))) {
          await clearBootSnapshot();
          queryCache.clearAll();
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (currentSession?.user) {
          setUser(currentSession.user);
          setLoading(false);
          clearTimeout(safetyTimer);
          // Hydrate queries if not hydrated already
          await queryCache.hydrateUserSnapshots(currentSession.user.id);
          void fetchUserProfile(currentSession.user.id, currentSession.user);
        } else if (!hasCachedSession && currentSession === null) {
          // No cached session and Supabase verified no active session
          setLoading(false);
        }
      } catch (e) {
        console.warn('[UserContext] Session init warning:', e);
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // Set up AppState listener to check session when active
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            setUser(data.session.user);
            void fetchUserProfile(data.session.user.id, data.session.user);
          }
        } catch (err) {
          console.warn('Error checking session on AppState transition:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;
      setLoading(false);

      if (event === 'SIGNED_OUT') {
        // Explicit sign out: wipe boot snapshot, cache, and state
        await clearBootSnapshot();
        queryCache.clearAll();
        setUser(null);
        setProfile(null);
      } else if (nextSession?.user) {
        // If switching accounts or logging in as a different user, isolate caches completely
        const previousUserId = userRef.current?.id;
        if (previousUserId && previousUserId !== nextSession.user.id) {
          queryCache.clearAll();
        }

        setUser(nextSession.user);
        void persistBootSnapshot(nextSession.user, profileRef.current);
        await queryCache.hydrateUserSnapshots(nextSession.user.id);
        void fetchUserProfile(nextSession.user.id, nextSession.user);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      appStateSubscription.remove();
      subscription.unsubscribe();
    };
  }, []);

  const signOut = React.useCallback(async () => {
    try {
      await clearBootSnapshot();
      queryCache.clearAll();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[UserContext] Error during signOut:', err);
    } finally {
      await clearBootSnapshot();
      queryCache.clearAll();
      setUser(null);
      setProfile(null);
    }
  }, [clearBootSnapshot]);

  return (
    <UserContext.Provider value={{ user, profile, loading, refreshProfile, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
