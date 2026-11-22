import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getCoalescedSession } from './supabase';
import { queryCache } from './queryCache';
import { isProPlan } from './plan';
import { BLOCKING_HISTORY_UPDATED } from '../services/blockingTelemetrySync';
import { clearWidgetsOnSignOut } from '../services/widgetSync';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  plan: string;
  plan_expires_at: string | null;
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

/**
 * AsyncStorage keys (or prefixes) holding one account's data, cleared on sign-out and account switch
 * so nothing of the previous user shows, or syncs, under the next one. Device preferences (theme,
 * language, blocking rules) and keys already scoped by user id are deliberately not listed.
 */
const USER_SCOPED_KEY_PREFIXES = [
  BOOT_USER_KEY,
  '@focalyst_snap:',
  '@focalyst_blocking_sessions_history_v1',
  // Unsynced blocking sessions would otherwise upload under the next account.
  '@focalyst_blocking_pending_sync_v1',
  // Queued offline writes belong to the account that made them.
  '@focalyst_offline_queue_v1',
  '@focalyst_pomodoro_session_v1',
  '@focalyst_widget_completed_task_ids',
  '@focalyst_calendar_events_widget_v1',
];

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
  const lastFetchedProfileRef = React.useRef<{ userId: string; profile: UserProfile; lastFetchedAt: number } | null>(null);

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

  /** Boot snapshot, query cache and every per-user AsyncStorage key, so the next account starts clean. */
  const clearUserLocalData = React.useCallback(async () => {
    lastFetchedProfileRef.current = null;
    await clearBootSnapshot();
    queryCache.clearAll();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter((k) => USER_SCOPED_KEY_PREFIXES.some((p) => k.startsWith(p)));
      if (userKeys.length) await AsyncStorage.multiRemove(userKeys);
    } catch (e) {
      console.warn('[UserContext] Failed to clear user storage:', e);
    }
    // Screens holding the old account's distraction history reload it (now empty).
    DeviceEventEmitter.emit(BLOCKING_HISTORY_UPDATED);
  }, [clearBootSnapshot]);

  const fetchUserProfile = React.useCallback(async (userId: string, currentUser?: any, forceRefresh = false): Promise<UserProfile | null> => {
    if (!userId) return null;
    const now = Date.now();
    if (
      !forceRefresh &&
      profileRef.current !== null &&
      lastFetchedProfileRef.current &&
      lastFetchedProfileRef.current.userId === userId &&
      lastFetchedProfileRef.current.profile &&
      (now - lastFetchedProfileRef.current.lastFetchedAt < 5 * 60 * 1000)
    ) {
      return lastFetchedProfileRef.current.profile;
    }
    if (isFetchingProfileRef.current === userId) return null;
    isFetchingProfileRef.current = userId;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, plan, plan_expires_at, ai_message_count, last_message_date, onboarding_done, total_xp, current_level, current_title')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();

      if (!error && data) {
        // The user switched accounts while this request was in flight: drop it.
        if (userRef.current?.id && userRef.current.id !== userId) return null;
        const rawPlan = data.plan || 'free';
        const isPlanActive = isProPlan(rawPlan, data.plan_expires_at);
        const uProfile: UserProfile = {
          id: data.id,
          email: data.email || '',
          full_name: data.full_name,
          plan: rawPlan,
          plan_expires_at: data.plan_expires_at || null,
          isPro: isPlanActive,
          ai_message_count: data.ai_message_count || 0,
          last_message_date: data.last_message_date || null,
          onboarding_done: data.onboarding_done || false,
          total_xp: data.total_xp || 0,
          current_level: data.current_level || 1,
          current_title: data.current_title || 'Ignition',
        };
        lastFetchedProfileRef.current = { userId, profile: uProfile, lastFetchedAt: Date.now() };
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
      const { data } = await getCoalescedSession();
      const sessionUser = data?.session?.user;
      if (sessionUser) {
        return await fetchUserProfile(sessionUser.id, sessionUser, true);
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
            // Only trust a cached profile that belongs to the cached user.
            if (parsed.profile?.id === parsed.user.id) {
              setProfile({ ...parsed.profile, isPro: isProPlan(parsed.profile.plan, parsed.profile.plan_expires_at) });
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

        // Validate token against Supabase auth server when a session exists
        let verifiedUser = currentSession?.user ?? null;
        let authInvalid = false;

        if (verifiedUser && !authInvalid) {
          try {
            const { data: userData, error: userError } = await Promise.race([
              supabase.auth.getUser(),
              new Promise<{ data: { user: null }; error: any }>((resolve) =>
                setTimeout(() => resolve({ data: { user: null }, error: null }), 3000)
              ),
            ]);
            if (!userError && userData?.user) verifiedUser = userData.user;
          } catch (getUserErr) {
            console.warn('[UserContext] getUser() check warning:', getUserErr);
          }
        }

        // If session is missing, expired, or invalid, clear stale boot snapshot & sign out
        if (!verifiedUser) {
          // Do not clobber a user that just signed in via onAuthStateChange while initAuth was in flight.
          if (userRef.current) return;
          if (!currentSession && !sessionError && hasCachedSession) {
            await clearUserLocalData();
          }
          if (currentSession || sessionError) return;
          userRef.current = null;
          profileRef.current = null;
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        userRef.current = verifiedUser;
        setUser(verifiedUser);
        setLoading(false);
        clearTimeout(safetyTimer);
        await queryCache.hydrateUserSnapshots(verifiedUser.id);
        void fetchUserProfile(verifiedUser.id, verifiedUser);
      } catch (e) {
        console.warn('[UserContext] Session init warning:', e);
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // onAuthStateChange handles session updates and token refreshes automatically on resume.
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isMounted) {
        setLoading(false);
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;
      setLoading(false);

      if (event === 'SIGNED_OUT') {
        await clearWidgetsOnSignOut();
        // Explicit sign out: wipe boot snapshot, cache, per-user storage and state
        await clearUserLocalData();
        userRef.current = null;
        profileRef.current = null;
        setUser(null);
        setProfile(null);
      } else if (nextSession?.user) {
        // Switching accounts (or signing in after someone else): drop everything of the previous user.
        const previousUserId = userRef.current?.id ?? profileRef.current?.id;
        const switched = !!previousUserId && previousUserId !== nextSession.user.id;
        if (switched) await clearUserLocalData();

        userRef.current = nextSession.user;
        setUser(nextSession.user);
        // Never pair the new user with another account's profile, in memory or on disk.
        const keptProfile = profileRef.current?.id === nextSession.user.id ? profileRef.current : null;
        if (!keptProfile) {
          profileRef.current = null;
          setProfile(null);
        }
        void persistBootSnapshot(nextSession.user, keptProfile);
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
      await clearUserLocalData();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[UserContext] Error during signOut:', err);
    } finally {
      await clearUserLocalData();
      userRef.current = null;
      profileRef.current = null;
      setUser(null);
      setProfile(null);
    }
  }, [clearUserLocalData]);

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
